import { Request, Response } from "express";
import { listJobManagers, listStates } from "../services/lookups.service";

export async function getJobManagers(_req: Request, res: Response) {
  res.json(await listJobManagers());
}

export async function getStates(_req: Request, res: Response) {
  res.json(await listStates());
}
