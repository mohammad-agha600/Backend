import { Request, Response } from "express";
import xlsx from "xlsx";
import { prisma } from "../config/prisma.js";
import slugify from "slugify";
import fs from "fs";
import path from "path";

type RawRow = Record<string, string | number | undefined>;

export const importProducts = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const uploadDir = 'uploads'
    if(!fs.existsSync(uploadDir)){
      fs.mkdirSync(uploadDir)
    }
    const slug = slugify.default;
    const filePath = path.resolve(req.file.path);
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet) as unknown[];

    const [categories, tags, variants] = await Promise.all([
      prisma.category.findMany(),
      prisma.tag.findMany(),
      prisma.variant.findMany(),
    ]);

    const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
    const tagMap = new Map(tags.map((t) => [t.slug, t]));
    const variantMap = new Map(variants.map((v) => [`${v.key}:${v.value}`, v.id]));

    for (const _row of rows) {
      const row = _row as RawRow;
      if (!row.name) continue;

      const productSlug = slug(String(row.name), { lower: true });

      const images = String(row.images || "")
        .split(/[,|]/)
        .map((i) => i.trim())
        .filter(Boolean);

      const productData: any = {
        name: row.name,
        slug: productSlug,
        description: row.description || "",
        price: Number(row.price || 0),
        discount: Number(row.discount || 0),
        stock: Number(row.stock || 0),
        image: images[0] || "",
        images: {
          create: images.slice(1).map((url) => ({ url })),
        },
      };

      const categoryKey = row.category?.toString().toLowerCase();
      if (categoryKey && categoryMap.has(categoryKey)) {
        productData.category = {
          connect: { id: categoryMap.get(categoryKey)! },
        };
      }

      const newProduct = await prisma.product.create({ data: productData });

      // 🔹 Handle parent and child tags
      const tagPairs = String(row.tags || "")
        .split(/[,|]/)
        .map((s) => s.trim())
        .filter(Boolean);

      for (const tagStr of tagPairs) {
        const [parentRaw, childRaw] = tagStr.split("/").map((s) => s.trim());
        const parentSlug = slug(parentRaw);
        const childSlug = childRaw ? slug(childRaw) : null;

        let parentTag = tagMap.get(parentSlug);
        if (!parentTag) {
          parentTag = await prisma.tag.create({
            data: {
              name: parentRaw,
              slug: parentSlug,
            },
          });
          tagMap.set(parentSlug, parentTag);
        }

        await prisma.productTag.create({
          data: {
            productId: newProduct.id,
            tagId: parentTag.id,
          },
        });

        if (childSlug) {
          let childTag = tagMap.get(childSlug);
          if (!childTag) {
            childTag = await prisma.tag.create({
              data: {
                name: childRaw,
                slug: childSlug,
                parentId: parentTag.id,
              },
            });
            tagMap.set(childSlug, childTag);
          }

          await prisma.productTag.create({
            data: {
              productId: newProduct.id,
              tagId: childTag.id,
            },
          });
        }
      }

      // 🔹 Handle variants
      const variantKeys = ["size", "color"];
      const productVariants: { variantId: string }[] = [];

      for (const key of variantKeys) {
        const rawValue = row[key];
        if (!rawValue) continue;

        const value = String(rawValue).trim();
        const variantKey = `${key}:${value}`;

        if (!variantMap.has(variantKey)) {
          const created = await prisma.variant.create({
            data: {
              key: key.charAt(0).toUpperCase() + key.slice(1),
              value,
            },
          });
          variantMap.set(variantKey, created.id);
        }

        productVariants.push({ variantId: variantMap.get(variantKey)! });
      }

      if (productVariants.length > 0) {
        const stock = Number(row.stock || 0);
        const price = Number(row.price || 0);

        await prisma.productVariantCombination.create({
          data: {
            productId: newProduct.id,
            stock,
            price,
            variants: {
              create: productVariants.map((v) => ({
                variant: { connect: { id: v.variantId } },
              })),
            },
          },
        });
      }
    }

    fs.unlinkSync(filePath);
    res.status(200).json({ message: "Products imported successfully" });
  } catch (err) {
    console.error("Import Error:", err);
    res.status(500).json({ message: "Failed to import products", error: err });
  }
};
