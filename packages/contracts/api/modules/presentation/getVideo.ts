import { oc } from "@orpc/contract";
import { z } from "zod/v4";

export const presentationGetVideoInput = z.object({
    range: z.string().optional(),
});

export const presentationGetVideoOutput = z.object({
    status: z.number().optional(),
    headers: z.record(z.string(), z.string().optional()),
    body: z.file(),
});

export const presentationGetVideoContract = oc
    .route({
        method: "GET",
        path: "/video",
        summary: "Stream presentation video with Range request support",
        description: "Stream the presentation video file with support for HTTP Range requests for seeking and partial content delivery",
        outputStructure: "detailed",
    })
    .input(presentationGetVideoInput)
    .output(presentationGetVideoOutput);
