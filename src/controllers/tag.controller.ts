import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

// Create Tag// Create Tag
export const createTag = async (req: Request, res: Response) => {
  const { name, slug, parentId, categoryId } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ success: false, message: 'Name is required' });
  }

  try {
    let finalSlug = slug?.trim() || name.trim().toLowerCase().replace(/\s+/g, '-');
    let finalCategoryId = categoryId && categoryId !== '' ? categoryId : null;
    let finalParentId = parentId || null;

    if (finalParentId) {
      const parent = await prisma.tag.findUnique({ where: { id: finalParentId } });
      if (!parent) {
        return res.status(400).json({ success: false, message: 'Invalid parent ID' });
      }

      finalCategoryId = parent.categoryId;
      finalSlug = `${finalSlug}-${parent.slug}`;
    } else {
      // Validate categoryId for parent tags
      if (!finalCategoryId) {
        return res.status(400).json({ success: false, message: 'Category is required for parent tags' });
      }

      const categoryExists = await prisma.category.findUnique({
        where: { id: finalCategoryId },
      });

      if (!categoryExists) {
        return res.status(400).json({ success: false, message: 'Invalid category ID' });
      }
    }

    const tag = await prisma.tag.create({
      data: {
        name: name.trim(),
        slug: finalSlug,
        parentId: finalParentId,
        categoryId: finalCategoryId,
      },
    });

    res.status(201).json({ success: true, tag });
  } catch (error) {
    console.error('Create tag error:', error);
    res.status(500).json({ success: false, message: 'Failed to create tag' });
  }
};


// Get All Tags
export const getAllTags = async (_req: Request, res: Response) => {
  try {
    const tags = await prisma.tag.findMany({
      where: { parentId: null },
      include: { children: true }, // load subtags
      orderBy: { name: 'asc' },
    });

    res.status(200).json({ success: true, tags });
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tags' });
  }
};
// GET /api/tags/flat — fetches all tags (parents and subtags flat)
export const getAllFlatTags = async (_req: Request, res: Response) => {
  try {
    const tags = await prisma.tag.findMany({
      include: {
        parent: true, // For subtags to know their parent
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({ success: true, tags });
  } catch (error) {
    console.error('Get flat tags error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch flat tags' });
  }
};

// Update Tag
export const updateTag = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, slug, parentId,categoryId } = req.body;

  try {
    let finalSlug = slug?.trim() || name.trim().toLowerCase().replace(/\s+/g, '-');

    let updateData: any = {
      name: name.trim(),
      slug: finalSlug,
    };

    if (parentId !== undefined) {
      if (parentId) {
        const parent = await prisma.tag.findUnique({ where: { id: parentId } });
        if (!parent) {
          return res.status(400).json({ success: false, message: 'Invalid parent ID' });
        }
        finalSlug = `${finalSlug}-${parent.slug}`;
        updateData.parentId = parentId;
        updateData.categoryId = parent.categoryId
        updateData.slug = finalSlug;
      } else {
        // Explicitly removing parent
        updateData.parentId = null;
        if(categoryId){
          const cat = await prisma.category.findUnique({where:{id:categoryId}})
          if(!cat){
            return res.status(400).json({success:false,message:"Invalid Category Id"})
          }
          updateData.categoryId = categoryId
        }
      }
    }

    const tag = await prisma.tag.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({ success: true, tag });
  } catch (error) {
    console.error('Update tag error:', error);
    res.status(500).json({ success: false, message: 'Failed to update tag' });
  }
};


// Delete Tag

export const deleteTag = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Get all child tags (subtags)
    const children = await prisma.tag.findMany({
      where: { parentId: id },
      select: { id: true },
    });

    // Delete all references in productTag for children
    const childIds = children.map(child => child.id);

    if (childIds.length > 0) {
      await prisma.productTag.deleteMany({
        where: { tagId: { in: childIds } },
      });

      // Delete all child tags
      await prisma.tag.deleteMany({
        where: { id: { in: childIds } },
      });
    }

    // Delete all references in productTag for parent
    await prisma.productTag.deleteMany({ where: { tagId: id } });

    // Delete the parent tag
    await prisma.tag.delete({ where: { id } });

    res.status(200).json({ success: true, message: 'Tag and its subtags deleted successfully' });
  } catch (error) {
    console.error('Delete tag error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete tag and subtags' });
  }
};

