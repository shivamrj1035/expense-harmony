"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function setupPrivacyPin(pin: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  if (!/^\d{4}$/.test(pin)) {
    throw new Error("PIN must be exactly 4 digits");
  }

  const hashedPin = await bcrypt.hash(pin, 10);

  await prisma.user.update({
    where: { clerkId: userId },
    data: {
      privacyPin: hashedPin,
      isPrivacyEnabled: true,
    },
  });

  revalidatePath("/");
  return { success: true };
}

export async function verifyPrivacyPin(pin: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { privacyPin: true },
  });

  if (!user?.privacyPin) {
    throw new Error("Privacy PIN not set up");
  }

  const isValid = await bcrypt.compare(pin, user.privacyPin);
  return { isValid };
}

export async function disablePrivacyMode(pin: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { privacyPin: true },
  });

  if (!user?.privacyPin) {
    throw new Error("Privacy PIN not set up");
  }

  const isValid = await bcrypt.compare(pin, user.privacyPin);
  if (!isValid) {
    throw new Error("Invalid PIN");
  }

  await prisma.user.update({
    where: { clerkId: userId },
    data: {
      privacyPin: null,
      isPrivacyEnabled: false,
    },
  });

  revalidatePath("/");
  return { success: true };
}

export async function togglePrivacyFeature(enabled: boolean) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  await prisma.user.update({
    where: { clerkId: userId },
    data: { isPrivacyEnabled: enabled },
  });

  revalidatePath("/");
  return { success: true };
}
