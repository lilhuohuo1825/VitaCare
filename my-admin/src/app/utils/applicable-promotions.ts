/**
 * Logic ràng buộc khuyến mãi — đồng bộ với my-user PromotionService.buildApplicablePromotions,
 * mở rộng: scope/order không phân biệt hoa thường, target ProductGroup, loại trừ KM theo nhóm khách trên form admin.
 */

export interface CartLikeItem {
  _id?: string;
  productId?: string;
  price?: number;
  quantity?: number;
  category?: string;
  categoryId?: string;
  discount?: number;
}

export interface PromotionLike {
  _id?: string;
  promotion_id?: string;
  code?: string;
  name?: string;
  promotion_name?: string;
  description?: string;
  type?: string;
  scope?: string;
  discount_type?: string;
  discount_value?: number;
  value?: number;
  max_discount_value?: number;
  min_order_value?: number;
  usage_limit?: number;
  user_limit?: number;
  is_first_order_only?: boolean;
  start_date?: string;
  end_date?: string;
  status?: string;
  target_category_id?: string | string[];
  product_group_id?: string | string[];
  targets?: any[];
}

export interface PromotionTargetRow {
  promotion_id: string;
  target_type: string;
  target_ref: string[];
}

export interface ApplicablePromotion extends PromotionLike {
  discountAmount: number;
  isApplicable: boolean;
  reason?: string;
}

export function buildTargetsForPromotion(promo: PromotionLike): PromotionTargetRow[] {
  const pid = String(promo.promotion_id || promo._id || '');
  const out: PromotionTargetRow[] = [];

  const embed = promo.targets;
  if (Array.isArray(embed)) {
    for (const t of embed) {
      const tt0 = Array.isArray(t.target_type) ? t.target_type[0] : t.target_type;
      const tr = t.target_ref;
      const refs = Array.isArray(tr)
        ? tr.map(String)
        : typeof tr === 'string' && tr
          ? tr.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
          : [];
      out.push({ promotion_id: pid, target_type: String(tt0 || ''), target_ref: refs });
    }
  }

  const rawType = String(promo.type || 'customer').toLowerCase();
  if (out.length === 0) {
    if (rawType === 'category' && promo.target_category_id) {
      const refs = ([] as string[]).concat(promo.target_category_id as string[]).map(String);
      if (refs.length) out.push({ promotion_id: pid, target_type: 'Category', target_ref: refs });
    }
    if (rawType === 'product' && promo.product_group_id) {
      const refs = ([] as string[]).concat(promo.product_group_id as string[]).map(String);
      if (refs.length) out.push({ promotion_id: pid, target_type: 'ProductGroup', target_ref: refs });
    }
  }
  return out;
}

export function buildAllTargetsFromPromotions(promotions: PromotionLike[]): PromotionTargetRow[] {
  const all: PromotionTargetRow[] = [];
  for (const p of promotions || []) {
    all.push(...buildTargetsForPromotion(p));
  }
  return all;
}

export function buildProductIdsByGroupId(groups: any[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const g of groups || []) {
    const gid = String(g?._id || g?.id || '');
    if (!gid) continue;
    const raw = g?.products || g?.productIds || g?.product_ids || g?.items;
    let ids: string[] = [];
    if (Array.isArray(raw)) {
      ids = raw
        .map((x: any) => String(x?._id || x?.productId || x?.id || x))
        .filter(Boolean);
    }
    m.set(gid, ids);
  }
  return m;
}

const FREE_SHIPPING_THRESHOLD = 300_000;
const DEFAULT_SHIPPING_FEE = 30_000;

function itemEligiblePrice(it: CartLikeItem): number {
  const q = Number(it.quantity) || 1;
  const p = Number(it.price) || 0;
  const d = Number(it.discount) || 0;
  return (p + d) * q;
}

export function buildApplicablePromotionsForAdminOrder(
  promotions: PromotionLike[],
  cartItems: CartLikeItem[],
  /** Tổng tiền hàng (giá niêm + discount dòng) — dùng kiểm tra min_order, phạm vi shipping */
  subtotalForRules: number,
  categories: any[] | undefined,
  productIdsByGroupId: Map<string, string[]>,
  isFirstOrder: boolean,
): ApplicablePromotion[] {
  const now = new Date();
  const allTargets = buildAllTargetsFromPromotions(promotions);

  const byPromotionId = new Map<string, PromotionTargetRow[]>();
  allTargets.forEach((t) => {
    const list = byPromotionId.get(t.promotion_id) ?? [];
    list.push(t);
    byPromotionId.set(t.promotion_id, list);
  });

  const parentMap = new Map<string, string>();
  const nameToId = new Map<string, string>();
  if (categories && Array.isArray(categories)) {
    categories.forEach((c) => {
      if (c._id) {
        if (c.name) nameToId.set(String(c.name).toLowerCase().trim(), String(c._id));
        if (c.parentId) parentMap.set(String(c._id), String(c.parentId));
      }
    });
  }

  const getAncestors = (cat: string): string[] => {
    if (!cat) return [];
    const result: string[] = [];
    const strCat = String(cat).trim();
    let currentId = nameToId.get(strCat.toLowerCase()) || strCat;
    const visited = new Set<string>();
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      result.push(currentId);
      currentId = parentMap.get(currentId) || '';
    }
    return result;
  };

  const result: ApplicablePromotion[] = [];

  for (const promo of promotions) {
    let isApplicable = true;
    let reason: string | undefined;
    const pid = String(promo.promotion_id || promo._id || '');

    if (promo.status && String(promo.status).toLowerCase() !== 'active') {
      isApplicable = false;
      reason = 'Chương trình đã kết thúc';
    }

    if (isApplicable && promo.start_date) {
      const s = new Date(promo.start_date);
      if (now < s) {
        isApplicable = false;
        reason = 'Chương trình chưa bắt đầu';
      }
    }
    if (isApplicable && promo.end_date) {
      const e = new Date(promo.end_date);
      if (now > e) {
        isApplicable = false;
        reason = 'Chương trình đã hết hạn';
      }
    }

    if (isApplicable && promo.is_first_order_only && !isFirstOrder) {
      isApplicable = false;
      reason = 'Chỉ áp dụng cho đơn hàng đầu tiên';
    }

    const minOrder = Number(promo.min_order_value) || 0;
    if (isApplicable && subtotalForRules < minOrder) {
      isApplicable = false;
      reason = 'Chưa đạt giá trị đơn tối thiểu';
    }

    const promoTargets = byPromotionId.get(pid) ?? [];

    if (isApplicable && promoTargets.length > 0) {
      const onlyCustomerTargets = promoTargets.every((t) => {
        const tt = String(t.target_type);
        return (
          tt === 'Customer' ||
          tt === 'CustomerGroup' ||
          tt === 'CustomerTier'
        );
      });
      if (onlyCustomerTargets) {
        isApplicable = false;
        reason = 'Khuyến mãi theo nhóm khách — không kiểm tra được khi tạo đơn thủ công';
      }
    }

    let eligibleSubtotal = 0;

    if (isApplicable) {
      const scopeRaw = String(promo.scope || 'order').toLowerCase();

      if (scopeRaw === 'shipping') {
        const shippingFee =
          subtotalForRules > FREE_SHIPPING_THRESHOLD ? 0 : DEFAULT_SHIPPING_FEE;
        if (shippingFee <= 0) {
          isApplicable = false;
          reason = 'Đơn này đang được miễn phí vận chuyển';
        } else {
          eligibleSubtotal = shippingFee;
        }
      } else {
        const hasNarrowTargets = promoTargets.some((t) => {
          const tt = String(t.target_type);
          return tt === 'Category' || tt === 'Product' || tt === 'ProductGroup';
        });

        if (!hasNarrowTargets || promoTargets.length === 0) {
          eligibleSubtotal = subtotalForRules;
        } else {
          for (const item of cartItems) {
            const catId = String(item.category || item.categoryId || '');
            const itemId = String(item.productId || item._id || '');
            const lineVal = itemEligiblePrice(item);

            const ancestors = getAncestors(catId);
            let matched = false;

            for (const t of promoTargets) {
              const tt = String(t.target_type);
              if (tt === 'Category') {
                if (t.target_ref?.some((ref) => ancestors.includes(String(ref)))) {
                  matched = true;
                  break;
                }
              }
              if (tt === 'Product' && t.target_ref?.includes(itemId)) {
                matched = true;
                break;
              }
              if (tt === 'ProductGroup') {
                for (const gid of t.target_ref || []) {
                  const inGroup = productIdsByGroupId.get(String(gid)) || [];
                  if (inGroup.includes(itemId)) {
                    matched = true;
                    break;
                  }
                }
                if (matched) break;
              }
            }

            if (matched) {
              eligibleSubtotal += lineVal;
            }
          }

          if (eligibleSubtotal <= 0) {
            isApplicable = false;
            reason = 'Giỏ hàng chưa có sản phẩm phù hợp với chương trình';
          }
        }
      }
    }

    const discountType = String(
      promo.discount_type === 'percentage' ? 'percent' : promo.discount_type || 'amount',
    );
    const discountVal = Number(
      promo.discount_value != null ? promo.discount_value : promo.value || 0,
    );

    let discountAmount = 0;
    if (isApplicable) {
      if (discountType === 'percent') {
        discountAmount = (eligibleSubtotal * discountVal) / 100;
        const cap = Number(promo.max_discount_value) || 0;
        if (cap > 0) discountAmount = Math.min(discountAmount, cap);
      } else {
        discountAmount = discountVal;
      }
      discountAmount = Math.floor(discountAmount);
      if (discountAmount <= 0) {
        isApplicable = false;
        reason = 'Không tính được số tiền giảm phù hợp';
      }
      const scopeRaw = String(promo.scope || 'order').toLowerCase();
      if (isApplicable && scopeRaw === 'shipping' && discountAmount > eligibleSubtotal) {
        discountAmount = eligibleSubtotal;
      }
    }

    result.push({
      ...promo,
      discountAmount: isApplicable ? discountAmount : 0,
      isApplicable,
      reason,
    });
  }

  return result.sort((a, b) => {
    if (a.isApplicable && !b.isApplicable) return -1;
    if (!a.isApplicable && b.isApplicable) return 1;
    return (b.discountAmount || 0) - (a.discountAmount || 0);
  });
}

export const ADMIN_ORDER_FREE_SHIPPING_THRESHOLD = FREE_SHIPPING_THRESHOLD;
export const ADMIN_ORDER_DEFAULT_SHIPPING_FEE = DEFAULT_SHIPPING_FEE;
