import { Router, Request, Response } from 'express';
import { searchOneMap, calculateDistance } from '../lib/location';

export const locationRouter = Router();

locationRouter.get('/search', async (req: Request, res: Response) => {
  const query = req.query.query as string | undefined;
  if (!query) {
    return res.status(400).json({
      ok: false,
      code: 'INVALID_REQUEST',
      message: 'Parameter "query" is required',
    });
  }

  const result = await searchOneMap(query);
  return res.status(result.ok ? 200 : 503).json(result);
});

locationRouter.get('/distance', async (req: Request, res: Response) => {
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;

  if (!from || !to) {
    return res.status(400).json({
      ok: false,
      code: 'INVALID_REQUEST',
      message: 'Both "from" and "to" parameters are required',
    });
  }

  const result = await calculateDistance(from, to);
  return res.status(result.ok ? 200 : 503).json(result);
});
