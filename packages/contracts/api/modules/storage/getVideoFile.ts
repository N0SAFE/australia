import { oc } from "@orpc/contract";
import { z } from "zod";

/**
 * Get video metadata and file by ID
 * GET /storage/video/:fileId
 */
export const getVideoFileContract = oc
    .route({
        method: "GET",
        path: "/video/:fileId",
        summary: "Get video file",
        description: "Get video file and metadata by ID",
        outputStructure: "detailed",
    })
    .input(
        z.object({
            fileId: z.uuid(),
        })
    )
    .output(
        z.object({
            status: z.number().optional(),
            headers: z.record(z.string(), z.string().optional()),
            body: z.file(),
        })
    );
