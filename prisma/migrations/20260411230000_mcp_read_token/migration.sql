CREATE TABLE "McpReadToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "McpReadToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "McpReadToken_tokenHash_key" ON "McpReadToken"("tokenHash");

CREATE INDEX "McpReadToken_userId_revokedAt_idx" ON "McpReadToken"("userId", "revokedAt");

ALTER TABLE "McpReadToken" ADD CONSTRAINT "McpReadToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
