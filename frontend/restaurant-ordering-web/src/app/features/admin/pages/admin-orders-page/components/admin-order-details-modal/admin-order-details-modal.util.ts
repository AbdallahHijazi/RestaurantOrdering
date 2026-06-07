import { OrderStatus } from '../../../../../kitchen/data-access/kitchen-orders.models';

export interface OrderDetailsTimelineStep {
  status: OrderStatus;
  labelKey:
    | 'adminOrderDetailsTimelineCreated'
    | 'adminOrderDetailsTimelinePreparing'
    | 'adminOrderDetailsTimelineReady'
    | 'adminOrderDetailsTimelineCompleted'
    | 'adminOrderDetailsTimelineCancelled';
  hintKey:
    | null
    | 'adminOrderDetailsTimelinePreparingHint'
    | 'adminOrderDetailsTimelineReadyHint'
    | 'adminOrderDetailsTimelineCompletedHint'
    | 'adminOrderDetailsTimelineCancelledHint';
  current: boolean;
  showTimestamp: boolean;
}

const PROGRESSION: readonly OrderStatus[] = [
  OrderStatus.New,
  OrderStatus.Preparing,
  OrderStatus.Ready,
  OrderStatus.Completed,
];

export function buildOrderDetailsTimeline(
  currentStatus: OrderStatus,
): OrderDetailsTimelineStep[] {
  if (currentStatus === OrderStatus.Cancelled) {
    return [
      {
        status: OrderStatus.New,
        labelKey: 'adminOrderDetailsTimelineCreated',
        hintKey: null,
        current: false,
        showTimestamp: true,
      },
      {
        status: OrderStatus.Cancelled,
        labelKey: 'adminOrderDetailsTimelineCancelled',
        hintKey: 'adminOrderDetailsTimelineCancelledHint',
        current: true,
        showTimestamp: false,
      },
    ];
  }

  const currentIndex = PROGRESSION.indexOf(currentStatus);
  const reached = PROGRESSION.slice(0, currentIndex + 1);

  return reached.map((status) => ({
    status,
    labelKey: timelineLabelKey(status),
    hintKey: timelineHintKey(status),
    current: status === currentStatus,
    showTimestamp: status === OrderStatus.New,
  }));
}

function timelineLabelKey(
  status: OrderStatus,
): OrderDetailsTimelineStep['labelKey'] {
  switch (status) {
    case OrderStatus.New:
      return 'adminOrderDetailsTimelineCreated';
    case OrderStatus.Preparing:
      return 'adminOrderDetailsTimelinePreparing';
    case OrderStatus.Ready:
      return 'adminOrderDetailsTimelineReady';
    case OrderStatus.Completed:
      return 'adminOrderDetailsTimelineCompleted';
    default:
      return 'adminOrderDetailsTimelineCreated';
  }
}

function timelineHintKey(
  status: OrderStatus,
): OrderDetailsTimelineStep['hintKey'] {
  switch (status) {
    case OrderStatus.Preparing:
      return 'adminOrderDetailsTimelinePreparingHint';
    case OrderStatus.Ready:
      return 'adminOrderDetailsTimelineReadyHint';
    case OrderStatus.Completed:
      return 'adminOrderDetailsTimelineCompletedHint';
    default:
      return null;
  }
}
