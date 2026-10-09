import type { Request, Response } from 'express';
import { principalsService } from './principals.service.js';
import type { UpsertPrincipalInput } from './principals.schemas.js';

export const principalsController = {
  getPrincipal: async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.params.schoolId as string;
    const principal = await principalsService.getPrincipal(
      schoolId,
      req.user?.schoolId,
      req.user?.role,
    );
    res.status(200).json({ success: true, data: principal });
  },

  upsertPrincipal: async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.params.schoolId as string;
    const body = req.body as UpsertPrincipalInput;
    const principal = await principalsService.upsertPrincipal(
      schoolId,
      body,
      req.user?.schoolId,
      req.user?.role,
    );
    res.status(200).json({ success: true, data: principal });
  },
};
