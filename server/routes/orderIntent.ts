import { Router, Request, Response } from 'express';
import { validateOrderIntentPayload } from '../lib/validation';
import { saveOrderIntent, saveEvent } from '../lib/storage';
import { getBatchById, registerOrderInBatch } from '../data/marketplaceBatches';

export const orderIntentRouter = Router();

orderIntentRouter.post('/', async (req: Request, res: Response) => {
  const validation = validateOrderIntentPayload(req.body);
  if (!validation.valid) {
    return res.status(400).json({
      ok: false,
      code: 'INVALID_REQUEST',
      message: validation.error,
    });
  }

  const { mealBatchId, quantity, fulfilmentType, sessionId, neighbourhood } = req.body;

  const batch = getBatchById(mealBatchId);
  if (!batch) {
    return res.status(404).json({
      ok: false,
      code: 'MEAL_NOT_FOUND',
      message: `Meal batch "${mealBatchId}" not found`,
    });
  }

  /**
   * PRICING RULE - PRE-ORDER FEE SNAPSHOT:
   * The fee recorded for THIS customer must be the fee they were shown before
   * their own order changed the delivery cluster. `batch` is the pre-order
   * snapshot, so the fee is captured here, BEFORE registerOrderInBatch() moves
   * the cluster. If this order is the one that reaches the threshold, the
   * cheaper unlocked fee applies to SUBSEQUENT customers - it is never applied
   * retroactively to the customer who triggered it.
   */
  const deliveryFee =
    fulfilmentType === 'pickup'
      ? 0
      : batch.deliveryClusterHouseholdsJoined >= batch.deliveryClusterThreshold
      ? batch.unlockedDeliveryFee
      : batch.currentDeliveryFee;

  // Update in-memory batch state only after this customer's fee is locked in.
  const updatedBatch = registerOrderInBatch(mealBatchId, quantity, fulfilmentType);

  // Persist order intent record, including the fee this customer was quoted.
  const savedIntent = await saveOrderIntent({
    sessionId,
    mealBatchId,
    quantity,
    fulfilmentType,
    deliveryFee,
    neighbourhood: neighbourhood || batch.neighbourhood,
  });

  // Also log behavioral event for analytics
  await saveEvent({
    event: 'order_intent_registered',
    sessionId,
    mealBatchId,
    timestamp: new Date().toISOString(),
    context: {
      quantity,
      fulfilmentType,
      deliveryFee,
      neighbourhood: neighbourhood || batch.neighbourhood,
      portionsBookedNow: updatedBatch?.portionsBooked,
      householdsJoinedNow: updatedBatch?.deliveryClusterHouseholdsJoined,
    },
  });

  return res.json({
    ok: true,
    intentRegistered: true,
    deliveryFee,
    orderSummary: {
      intentId: savedIntent.id,
      mealBatchId,
      mealName: batch.mealName,
      cookName: batch.cookName,
      quantity,
      fulfilmentType,
      portionPrice: batch.pricePerPortion,
      totalMealPrice: Math.round(batch.pricePerPortion * quantity * 100) / 100,
      deliveryFee,
      estimatedTotal: Math.round((batch.pricePerPortion * quantity + deliveryFee) * 100) / 100,
      pickupLocation: fulfilmentType === 'pickup' ? batch.pickupLocation : undefined,
      deliveryCluster: fulfilmentType === 'delivery' ? batch.deliveryClusterName : undefined,
    },
  });
});
