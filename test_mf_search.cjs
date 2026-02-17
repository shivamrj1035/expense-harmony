const queries = [
    "Axis Multicap Fund",
    "Aditya Birla Sun Life PSU Equity Fund",
    "Motilal Oswal Midcap Fund"
];

async function testSearch(q) {
    console.log(`Searching for: ${q}`);
    try {
        const response = await fetch(
            `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0`
        );
        const data = await response.json();
        const simplified = data.quotes.map(q => ({ symbol: q.symbol, name: q.shortname || q.longname, quoteType: q.quoteType }));
        console.log(`Results for "${q}":`, JSON.stringify(simplified, null, 2));
    } catch (e) {
        console.error(`Search failed for ${q}`, e);
    }
}

async function run() {
    for (const q of queries) {
        await testSearch(q);
    }
}

run();
