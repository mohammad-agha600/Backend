import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { uploadProductImage } from '../middleware/uploadImage.js'; // Cloudinary version
import { v2 as cloudinary } from 'cloudinary';
import { extractPublicId } from '../utils/extractPublicId.js';

// Helper: create or fetch variants
async function getOrCreateVariants(
  variants: Record<string, string>
): Promise<{ id: string }[]> {
  const entries = Object.entries(variants);
  const variantIds: { id: string }[] = [];

  for (const [key, value] of entries) {
    let variant = await prisma.variant.findFirst({ where: { key, value } });

    if (!variant) {
      variant = await prisma.variant.create({ data: { key, value } });
    }

    variantIds.push({ id: variant.id });
  }

  return variantIds;
}

// CREATE PRODUCT — Supports multiple Cloudinary uploads
export const createProduct = [
  uploadProductImage.array('images', 10),
  async (req: Request, res: Response) => {
    try {
      const {
        name,
        slug,
        description,
        price,
        stock = 0,
        discount = 0,
        categoryId,
        tagIds = [],
        combinations = [],
      } = req.body;

      if (!name || !price) {
        return res.status(400).json({
          success: false,
          message: 'Name and price are required',
        });
      }

      const files = req.files as Express.Multer.File[];
      const imageUrls = files?.map((file) => file.path) || [];
      console.log("uploaded image urls",imageUrls)
      
      const mainImage = imageUrls[0] || '';

      const result = await prisma.$transaction(async (prisma) => {
       console.log("starting transcation")
        const product = await prisma.product.create({
          data: {
            name,
            slug: slug || generateSlug(name),
            description,
            price: Number(price),
            stock: Number(stock),
            discount: Number(discount),
            image: mainImage,
            ...(categoryId && {
              category: { connect: { id: categoryId } },
            }),
            ...(tagIds.length > 0 && {
              productTags: {
                create: (Array.isArray(tagIds) ? tagIds : [tagIds]).map(
                  (tagId) => ({
                    tag: { connect: { id: tagId } },
                  })
                ),
              },
            }),
          },
        });
        console.log("product craeted with id",product.id)
        // Save other images (if any)
        if (imageUrls.length > 0) {
          console.log("saving images...")
          await prisma.productImage.createMany({
            data: imageUrls.map((url) => ({
              productId: product.id,
              url,
            })),
          });
        }
        console.log("images saved")
        // Handle variant combinations
        const parsedCombinations =
          typeof combinations === 'string'
            ? JSON.parse(combinations)
            : combinations;

        for (const combo of parsedCombinations || []) {
          const { variants, stock: comboStock, price: comboPrice, image } = combo;
          const variantIds = await getOrCreateVariants(variants);
          console.log('createing product with',{
            name,slug,price,categoryId,tagIds,mainImage
          })
         
          await prisma.productVariantCombination.create({
            data: {
              productId: product.id,
              stock: Number(comboStock),
              price: Number(comboPrice),
              image: image, // optional: you can Cloudinary-upload these too if needed
              variants: {
                create: variantIds.map((v) => ({
                  variant: { connect: { id: v.id } },
                })),
              },
            },
          });
        }
        if(parsedCombinations.length>0){
          console.log("creating combination",parsedCombinations)
        }
        console.log("product created last with",product.id)
        return product;
      });

      const productWithDetails = await prisma.product.findUnique({
        where: { id: result.id },
        include: {
          category: true,
          productTags: { include: { tag: true } },
          variantCombinations: {
            include: {
              variants: { include: { variant: true } },
            },
          },
          images: true,
        },
      });

      res.status(201).json({
        success: true,
        product: productWithDetails,
      });
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create product',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
];

// Slug generator
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}



// GET ALL PRODUCTS — PAGINATED
export const getAllProducts = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const tagIds = (req.query.tagIds as string)?.split(",") || [];
  const categoryId = req.query.categoryId as string;
  const search = req.query.search as string;

  try {
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        skip,
        take: limit,
        where: {
          ...(categoryId && { categoryId }),
          ...(search && {
            name: {
              contains: search,
              mode: "insensitive",
            },
          }),
          ...(tagIds.length > 0 && {
            productTags: {
              some: {
                tagId: {
                  in: tagIds,
                },
              },
            },
          }),
        },
        orderBy: { createdAt: "desc" },
        include: {
          category: true,
          productTags: {
            include: {
              tag: { include: { parent: true } },
            },
          },
          variantCombinations: {
            include: {
              variants: { include: { variant: true } },
            },
          },
          images:true
        },
      }),

      prisma.product.count({
        where: {
          ...(categoryId && { categoryId }),
          ...(search && {
            name: {
              contains: search,
              mode: "insensitive",
            },
          }),
          ...(tagIds.length > 0 && {
            productTags: {
              some: {
                tagId: {
                  in: tagIds,
                },
              },
            },
          }),
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      products,
      page,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch products!",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};



// GET PRODUCT BY ID
export const getProductById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images:true,
        productTags: { include: { tag: true } },
        variantCombinations: {
          include: { variants: { include: { variant: true } } },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found!' });
    }

    res.status(200).json({ success: true, product });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product!',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// UPDATE PRODUCT

export const updateProduct = [
  uploadProductImage.single("image"),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const {
        name,
        slug,
        description,
        price,
        stock,
        discount,
        categoryId,
        tagIds = [],
        combinations = [],
      } = req.body;

      const existingProduct = await prisma.product.findUnique({
         where: { id },        
        });

      if (!existingProduct) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      // If new image uploaded, get the Cloudinary URL
      const newImageUrl = req.file ? req.file.path : undefined;

      // Optionally: delete old image from Cloudinary
      if (newImageUrl && existingProduct.image) {
        const publicId = extractPublicId(existingProduct.image);
        if (publicId) await cloudinary.uploader.destroy(publicId);
      }

      const parsedCombinations =
        typeof combinations === 'string' ? JSON.parse(combinations) : combinations;

      const updatedProduct = await prisma.$transaction(async (prisma) => {
        const updateData: any = {
          name,
          slug,
          description,
          price: Number(price),
          stock: Number(stock),
          discount: Number(discount),
          ...(newImageUrl && { image: newImageUrl }),
          productTags: {
            deleteMany: {},
            ...(tagIds.length > 0 && {
              create: (Array.isArray(tagIds) ? tagIds : [tagIds]).map(tagId => ({
                tag: { connect: { id: tagId } }
              }))
            }),
          }
        };

        if (categoryId) {
          updateData.category = { connect: { id: categoryId } };
        }

        const product = await prisma.product.update({
          where: { id },
          data: updateData,
        });

        // Update combinations
        if (parsedCombinations) {
          const existingCombos = await prisma.productVariantCombination.findMany({
            where: { productId: id },
            select: { id: true }
          });

          const updatedIds: string[] = [];

          for (const combo of parsedCombinations) {
            const { id: comboId, variants, stock: comboStock, price: comboPrice, image } = combo;
            const variantIds = await getOrCreateVariants(variants);

            if (comboId) {
              await prisma.productVariantCombination.update({
                where: { id: comboId },
                data: {
                  stock: Number(comboStock),
                  price: Number(comboPrice),
                  image: image || null,
                  variants: {
                    deleteMany: {},
                    create: variantIds.map(v => ({
                      variant: { connect: { id: v.id } }
                    }))
                  }
                }
              });
              updatedIds.push(comboId);
            } else {
              const newCombo = await prisma.productVariantCombination.create({
                data: {
                  productId: id,
                  stock: Number(comboStock),
                  price: Number(comboPrice),
                  image: image || null,
                  variants: {
                    create: variantIds.map(v => ({
                      variant: { connect: { id: v.id } }
                    }))
                  }
                }
              });
              updatedIds.push(newCombo.id);
            }
          }

          const toDelete = existingCombos.filter(ec => !updatedIds.includes(ec.id));
          for (const del of toDelete) {
            await prisma.productVariantCombinationVariant.deleteMany({
              where: { combination: { id: del.id } }
            });
            await prisma.productVariantCombination.delete({ where: { id: del.id } });
          }
        }

        return product;
      });

      const productWithDetails = await prisma.product.findUnique({
        where: { id: updatedProduct.id },
        include: {
          category: true,
          productTags: { include: { tag: true } },
          variantCombinations: {
            include: { variants: { include: { variant: true } } },
          },
          images: true
        }
      });

      res.status(200).json({ success: true, product: productWithDetails });

    } catch (error) {
      console.error("Update product error:", error);
      res.status(500).json({
        success: false,
        message: 'Failed to update product',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
];



// DELETE PRODUCT
export const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
      },
    });

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // 🧹 Delete Cloudinary main image
    if (product.image) {
      const publicId = extractPublicId(product.image);
      if (publicId) await cloudinary.uploader.destroy(publicId);
    }

    // 🧹 Delete Cloudinary extra images
    for (const img of product.images) {
      const publicId = extractPublicId(img.url);
      if (publicId) await cloudinary.uploader.destroy(publicId);
    }

    await prisma.$transaction([
      prisma.productImage.deleteMany({ where: { productId: id } }),
      prisma.productTag.deleteMany({ where: { productId: id } }),
      prisma.cartItem.deleteMany({ where: { productId: id } }),
      prisma.orderItem.deleteMany({ where: { productId: id } }),
      prisma.productVariantCombinationVariant.deleteMany({
        where: { combination: { productId: id } },
      }),
      prisma.productVariantCombination.deleteMany({ where: { productId: id } }),
      prisma.product.delete({ where: { id } }),
    ]);

    res.status(200).json({ success: true, message: 'Product deleted successfully!' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete product!',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};


// GET LOW STOCK PRODUCTS
export const getLowStockProducts = async (_req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { stock: { lt: 10 } },
      orderBy: { stock: 'asc' },
    });

    res.status(200).json({ success: true, products });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch low stock products',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// RESTOCK PRODUCT
export const restockProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { quantity } = req.body;

  if (!quantity || quantity <= 0) {
    return res.status(400).json({ success: false, message: 'Quantity must be greater than 0' });
  }

  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        stock: { increment: quantity },
      },
    });

    res.status(200).json({ success: true, product });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to restock product!',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ADD VARIANT COMBOS TO EXISTING PRODUCT
export const addVariantCombinations = async (req: Request, res: Response) => {
  const { id: productId } = req.params;
  const { combinations } = req.body;

  if (!combinations || !Array.isArray(combinations)) {
    return res.status(400).json({ success: false, message: "Invalid combinations" });
  }

  try {
    for (const combo of combinations) {
      const { variants, stock, price, image } = combo;

      const variantIds = await getOrCreateVariants(variants);

      await prisma.productVariantCombination.create({
        data: {
          productId,
          stock: Number(stock),
          price: Number(price),
          image: image || null,
          variants: {
            create: variantIds.map((v) => ({
              variant: { connect: { id: v.id } },
            })),
          },
        },
      });
    }

    res.status(201).json({ success: true, message: "Combinations added" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to add combinations",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const updateProductDetails = [
  uploadProductImage.array("images", 10),

  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const {
        name,
        slug,
        description,
        price,
        stock = 0,
        discount,
        categoryId,
        tagIds = [],
      } = req.body;

      const existingProduct = await prisma.product.findUnique({
        where: { id },
        include: { images: true },
      });

      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      const parsedTagIds = Array.isArray(tagIds) ? tagIds : [tagIds];

      const updateData: any = {
        name,
        slug,
        description,
        price: Number(price),
        stock: Number(stock),
        discount: Number(discount),
        productTags: {
          deleteMany: {}, // Remove existing tags
          create: parsedTagIds.map((tagId) => ({
            tag: { connect: { id: tagId } },
          })),
        },
      };

      if (categoryId) {
        updateData.category = { connect: { id: categoryId } };
      }

      // Handle image uploads
      const files = req.files as Express.Multer.File[];

      if (files && files.length > 0) {
        // Delete old images from DB and Cloudinary
        const deleteImageIds = existingProduct.images.map((img) => img.id);
        await prisma.productImage.deleteMany({
          where: { id: { in: deleteImageIds } },
        });

        for (const img of existingProduct.images) {
          const publicId = img.url.split("/").pop()?.split(".")[0];
          if (publicId) {
            await cloudinary.uploader.destroy(`productImages/${publicId}`);
          }
        }

        // Upload new images
        const uploadPromises = files.map((file) =>
          cloudinary.uploader.upload(file.path, {
            folder: "productImages",
          })
        );
        const uploadedImages = await Promise.all(uploadPromises);

        // Update product first (without images)
        const updatedProduct = await prisma.product.update({
          where: { id },
          data: updateData,
        });

        // Create image entries
        await prisma.productImage.createMany({
          data: uploadedImages.map((img) => ({
            url: img.secure_url,
            productId: updatedProduct.id,
          })),
        });
      } else {
        // Update product without touching images
        await prisma.product.update({
          where: { id },
          data: updateData,
        });
      }

      const productWithDetails = await prisma.product.findUnique({
        where: { id },
        include: {
          category: true,
          productTags: { include: { tag: true } },
          variantCombinations: {
            include: {
              variants: { include: { variant: true } },
            },
          },
          images: true,
        },
      });

      res.status(200).json({
        success: true,
        product: productWithDetails,
      });
    } catch (error) {
      console.error("Update product error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update product",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
];


export const updateProductCombinations = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { combinations } = req.body;

    const parsedCombinations = typeof combinations === "string"
      ? JSON.parse(combinations)
      : combinations;

    const existingProduct = await prisma.product.findUnique({ where: { id } });
    if (!existingProduct) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Step 1: Get existing combination IDs for cleanup later
    const existingCombos = await prisma.productVariantCombination.findMany({
      where: { productId: id },
      select: { id: true }
    });
    const existingComboIds = existingCombos.map(c => c.id);
    const updatedIds: string[] = [];

    // Step 2: Run updates/creates in parallel
    const operations = parsedCombinations.map(async (combo: any) => {
      const { id: comboId, variants, price, stock } = combo;

      const variantIds = await getOrCreateVariants(variants);

      if (comboId) {
        updatedIds.push(comboId);
        return prisma.productVariantCombination.update({
          where: { id: comboId },
          data: {
            price: Number(price),
            stock: Number(stock),
            variants: {
              deleteMany: {}, // full replace for now
              create: variantIds.map(v => ({
                variant: { connect: { id: v.id } }
              }))
            }
          }
        });
      } else {
        const created = await prisma.productVariantCombination.create({
          data: {
            productId: id,
            price: Number(price),
            stock: Number(stock),
            variants: {
              create: variantIds.map(v => ({
                variant: { connect: { id: v.id } }
              }))
            }
          }
        });
        updatedIds.push(created.id);
      }
    });

    await Promise.all(operations);

    // Step 3: Cleanup orphaned combinations
    const toDelete = existingComboIds.filter(id => !updatedIds.includes(id));
    if (toDelete.length > 0) {
      await prisma.productVariantCombinationVariant.deleteMany({
        where: { productVariantCombinationId: { in: toDelete } }
      });

      await prisma.productVariantCombination.deleteMany({
        where: { id: { in: toDelete } }
      });
    }

    return res.status(200).json({
      success: true,
      updatedCombinationIds: updatedIds
    });

  } catch (error) {
    console.error(" Update variant combinations error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update variant combinations",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export const getProductBySlugOrName = async (req: Request, res: Response) => {
  const slugOrName = req.params.slugOrName;

  if (!slugOrName) {
    return res.status(400).json({ success: false, message: "Missing slug or name in request params." });
  }

  try {
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { slug: slugOrName },
          { name: slugOrName },
        ],
      },
      include: {
        category: true,
        productTags: {
          include: {
            tag: true,
          },
        },
        variantCombinations: {
          include: {
            variants:{
              include:{
                variant:true
              }
            }
          },
        },
        images: true,
      },
    });

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    return res.json({ success: true, product });
  } catch (error) {
    console.error("Error fetching product:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};