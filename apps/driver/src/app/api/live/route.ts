import { disruptionSchema, vehiclePositionSchema } from '@reise/shared';
import { z } from 'zod';
import { getLiveState, setLiveState } from '../../../lib/live-state';

export const dynamic = 'force-dynamic';

const payloadSchema = z.object({
  position: vehiclePositionSchema,
  disruption: disruptionSchema.optional(),
  tracking: z.enum(['offline', 'paused', 'active']),
});

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}

export function GET() {
  return Response.json(getLiveState(), { headers: cors });
}

export async function POST(request: Request) {
  const parsed = payloadSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: 'Invalid tracking payload', issues: parsed.error.issues }, { status: 400, headers: cors });
  const current = getLiveState();
  const incomingTime = new Date(parsed.data.position.deviceTimestamp).getTime();
  const currentTime = new Date(current.position.deviceTimestamp).getTime();
  if (incomingTime < currentTime && current.tracking !== 'offline') return Response.json({ error: 'Out-of-order tracking update rejected' }, { status: 409, headers: cors });
  const state = setLiveState({ ...parsed.data, updatedAt: new Date().toISOString() });
  return Response.json(state, { headers: cors });
}
