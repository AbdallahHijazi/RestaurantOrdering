import { OrderStatus } from '../../../../../kitchen/data-access/kitchen-orders.models';
import { buildOrderDetailsTimeline } from './admin-order-details-modal.util';

describe('buildOrderDetailsTimeline', () => {
  it('derives reached steps from current status without fake intermediate timestamps', () => {
    const steps = buildOrderDetailsTimeline(OrderStatus.Ready);

    expect(steps.map((step) => step.status)).toEqual([
      OrderStatus.New,
      OrderStatus.Preparing,
      OrderStatus.Ready,
    ]);
    expect(steps[0]?.showTimestamp).toBe(true);
    expect(steps[1]?.showTimestamp).toBe(false);
    expect(steps[2]?.current).toBe(true);
  });

  it('shows cancelled as a separate terminal step', () => {
    const steps = buildOrderDetailsTimeline(OrderStatus.Cancelled);

    expect(steps.map((step) => step.status)).toEqual([
      OrderStatus.New,
      OrderStatus.Cancelled,
    ]);
    expect(steps[1]?.current).toBe(true);
    expect(steps[1]?.showTimestamp).toBe(false);
  });
});
