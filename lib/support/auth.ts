import { getCurrentSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function getSupportUserActor() {
  const session = await getCurrentSession()
  if (!session || session.role !== "USER") {
    return null
  }

  return prisma.user.findUnique({
    select: {
      id: true,
      username: true,
    },
    where: {
      username: session.username,
    },
  })
}

export async function getSupportAdminActor() {
  const session = await getCurrentSession()
  if (!session || session.role !== "ADMIN") {
    return null
  }

  return prisma.user.findUnique({
    select: {
      id: true,
      username: true,
    },
    where: {
      username: session.username,
    },
  })
}
