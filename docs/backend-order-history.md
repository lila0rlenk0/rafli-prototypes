# Backend Changes - Order History

## Required Changes

### 1. GET /me/orders endpoint

**File**: `raffles-core-backend/src/core/orders/queries/get-orders.query.ts`

Join with raffles table to include `raffleName` and `raffleSlug` in response:

```typescript
// Current: only selects from orders
// Needed: join with raffles to get name and slug

const orders = await this.ordersRepository
  .createQueryBuilder('order')
  .leftJoinAndSelect('order.raffle', 'raffle')
  .where('order.userId = :userId', { userId })
  .select([
    'order.*',
    'raffle.title as raffleName',
    'raffle.publicSlugOrCode as raffleSlug',
  ])
  .orderBy('order.createdAt', 'DESC')
  .getMany();
```

### 2. Update Order DTO

**File**: `raffles-core-backend/src/core/orders/dto/order.dto.ts`

Add fields to response DTO:

```typescript
export class OrderResponseDto {
  // ... existing fields

  @ApiProperty({ description: 'Raffle name' })
  raffleName: string;

  @ApiProperty({ description: 'Raffle slug for URL', required: false })
  raffleSlug?: string;
}
```

### 3. GET /orders/:id endpoint

Same changes for single order endpoint to include raffle info.

## Frontend Impact

Once backend returns `raffleName` and `raffleSlug`:
- Order list will show raffle name instead of "N/A"
- Order details raffle link will use slug instead of ID
