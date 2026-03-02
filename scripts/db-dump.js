import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function generateInsertStatements(tableName, data) {
    if (data.length === 0) return '';

    const columns = Object.keys(data[0]);
    const columnList = columns.map(c => `"${c}"`).join(', ');

    const values = data.map(row => {
        const valList = columns.map(col => {
            const val = row[col];
            if (val === null) return 'NULL';
            if (val instanceof Date) return `'${val.toISOString()}'`;
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            if (Array.isArray(val)) return `'{"${val.join('","')}"}'`; // PostgreSQL array format
            return val;
        }).join(', ');
        return `(${valList})`;
    }).join(',\n');

    return `INSERT INTO "${tableName}" (${columnList}) VALUES \n${values};\n\n`;
}

async function main() {
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `dump_${timestamp}.sql`;
    const backupPath = path.join(backupDir, filename);

    console.log(`Starting database dump to backups/${filename}...`);

    try {
        // 1. Generate Schema
        console.log('Generating schema SQL...');
        const schemaSql = execSync('npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script', { encoding: 'utf-8' });

        let fullSql = `-- SpendWise Database Dump\n-- Generated on ${new Date().toISOString()}\n\n`;
        fullSql += '-- SCHEMA START --\n';
        fullSql += schemaSql;
        fullSql += '-- SCHEMA END --\n\n';

        // 2. Generate Data
        console.log('Generating data SQL...');

        // Get all models from the prisma client
        const models = Object.keys(prisma).filter(key =>
            !['_', '$'].some(prefix => key.startsWith(prefix)) && typeof prisma[key] === 'object'
        );

        // Disable triggers/constraints for insertion
        fullSql += '-- DATA START --\n';
        fullSql += 'SET session_replication_role = \'replica\';\n\n';

        for (const model of models) {
            console.log(`  Dumping table: ${model}...`);
            const data = await prisma[model].findMany();
            if (data.length > 0) {
                fullSql += await generateInsertStatements(model, data);
            }
        }

        fullSql += 'SET session_replication_role = \'origin\';\n';
        fullSql += '-- DATA END --';

        fs.writeFileSync(backupPath, fullSql);

        console.log(`\nSuccess! Database dump saved to: backups/${filename}`);
    } catch (error) {
        console.error('\nError performing database dump:');
        console.error(error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
