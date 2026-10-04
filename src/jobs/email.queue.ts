import type { Job } from 'bullmq';
import { createQueue } from './queue.factory.js';
import { logger } from '../lib/logger.js';

export interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  context?: Record<string, unknown>;
}

export const EMAIL_QUEUE_NAME = 'email';

export const emailQueue = createQueue<EmailJobData>(EMAIL_QUEUE_NAME);

export async function enqueueEmail(data: EmailJobData, jobId?: string): Promise<Job<EmailJobData>> {
  return emailQueue.add('send-email', data, {
    ...(jobId && { jobId }),
  });
}

export async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  logger.info(
    { jobId: job.id, to: job.data.to, subject: job.data.subject },
    'Processing email job',
  );

  // Simulate or integrate email sending
  await Promise.resolve();
  logger.info({ jobId: job.id }, 'Email sent successfully');
}
