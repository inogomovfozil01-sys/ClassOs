import {NextResponse} from 'next/server';
import prisma from '@/lib/prisma';
import {timingSafeEqual} from 'crypto';
const {runReminders}=require('@/lib/emaktab-store.cjs');
export const maxDuration=60;
export async function GET(req:Request){const secret=process.env.CRON_SECRET;const actual=req.headers.get('authorization')||'';const expected=`Bearer ${secret}`;if(!secret||actual.length!==expected.length||!timingSafeEqual(Buffer.from(actual),Buffer.from(expected)))return NextResponse.json({error:'Unauthorized'},{status:401});await runReminders(prisma);return NextResponse.json({ok:true})}
