import prisma from '../config/prisma.js';

/**
 * Parses the incoming variant combinations string into structured data.
 * Expected format:
 *   [{ price: number, stock: number, variants: { [key]: value } }]
 */
export function parseVariantCombinations(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('Invalid format');

    return parsed.map((combo: any) => {
      if (
        typeof combo.price !== 'number' ||
        typeof combo.stock !== 'number' ||
        typeof combo.variants !== 'object'
      ) {
        throw new Error('Invalid combination structure');
      }

      return {
        price: combo.price,
        stock: combo.stock,
        variantData: combo.variants, // { Size: "L", Color: "Red" }
        variantIds: [] as string[], // will be filled after
      };
    });
  } catch (err) {
    console.error('Failed to parse variantCombinations:', err);
    return [];
  }
}

/**
 * Takes a map of variant key-value pairs, returns an array of Variant IDs.
 * Creates any missing variants in the DB.
 */
export async function getOrCreateVariant(
  variants: Record<string, string>
): Promise<{ id: string }[]> {
  const entries = Object.entries(variants);
  const variantIds: { id: string }[] = [];

  for (const [key, value] of entries) {
    let variant = await prisma.variant.findFirst({
      where: {
        key,
        value,
      },
    });

    if (!variant) {
      variant = await prisma.variant.create({
        data: { key, value },
      });
    }

    variantIds.push({ id: variant.id });
  }

  return variantIds;
}
