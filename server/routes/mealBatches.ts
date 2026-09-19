import { Router, Request, Response } from 'express';
import { getAllBatches, getBatchById } from '../data/marketplaceBatches';

export const mealBatchesRouter = Router();

mealBatchesRouter.get('/', (req: Request, res: Response) => {
  const idQuery = req.query.id as string | undefined;
  if (idQuery) {
    const item = getBatchById(idQuery);
    if (!item) {
      return res.status(404).json({
        ok: false,
        code: 'MEAL_NOT_FOUND',
        message: `Meal batch with ID "${idQuery}" was not found`,
      });
    }
    return res.json({ ok: true, item });
  }

  const neighbourhood = req.query.neighbourhood as string | undefined;
  const items = getAllBatches(neighbourhood);
  return res.json({
    ok: true,
    total: items.length,
    items,
  });
});

mealBatchesRouter.get('/:id', (req: Request, res: Response) => {
  const item = getBatchById(req.params.id);
  if (!item) {
    return res.status(404).json({
      ok: false,
      code: 'MEAL_NOT_FOUND',
      message: `Meal batch with ID "${req.params.id}" was not found`,
    });
  }
  return res.json({ ok: true, item });
});
