import { Router, Request, Response } from 'express';
import { validateCommentPayload } from '../lib/validation';
import { saveComment, getComments } from '../lib/storage';

export const commentsRouter = Router();

commentsRouter.post('/', async (req: Request, res: Response) => {
  const validation = validateCommentPayload(req.body);
  if (!validation.valid) {
    return res.status(400).json({
      ok: false,
      code: 'INVALID_REQUEST',
      message: validation.error,
    });
  }

  try {
    const saved = await saveComment(validation.sanitized);
    return res.status(201).json({
      ok: true,
      commentSaved: true,
      id: saved.id,
    });
  } catch {
    return res.status(500).json({
      ok: false,
      code: 'STORAGE_UNAVAILABLE',
      message: 'Failed to record feedback comment',
    });
  }
});

commentsRouter.get('/', async (req: Request, res: Response) => {
  const limit = parseInt((req.query.limit as string) || '100', 10);
  const comments = await getComments(limit);
  return res.json({
    ok: true,
    total: comments.length,
    comments,
  });
});
