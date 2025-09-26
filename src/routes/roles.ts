import { Router } from "express";
import { authenticate, authorize, AuthRequest } from "@/middleware/auth";
import { asyncHandler } from "@/middleware/errorHandler";
import { UserRole } from "@prisma/client";
import { prisma } from "@/app";
import { z } from "zod";
import { Response } from "express";

const router = Router();

// Validation schemas
const createRoleSchema = z.object({
  name: z
    .string()
    .min(1, "Role name is required")
    .max(50, "Role name too long"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(200, "Description too long"),
  permissions: z
    .array(z.string())
    .min(1, "At least one permission is required"),
});

const updateRoleSchema = z.object({
  name: z
    .string()
    .min(1, "Role name is required")
    .max(50, "Role name too long")
    .optional(),
  description: z
    .string()
    .min(1, "Description is required")
    .max(200, "Description too long")
    .optional(),
  permissions: z
    .array(z.string())
    .min(1, "At least one permission is required")
    .optional(),
});

/**
 * @swagger
 * /api/roles:
 *   get:
 *     tags: [Role Management]
 *     summary: Get all roles
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Roles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       permissions:
 *                         type: array
 *                         items:
 *                           type: string
 *                       userCount:
 *                         type: number
 *       403:
 *         description: Insufficient permissions
 */
router.get(
  "/",
  authenticate,
  authorize([UserRole.admin, UserRole.super_admin]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    // Get all users to count role usage
    const users = await prisma.user.findMany({
      where: {
        organizationId: req.user!.organizationId,
      },
      select: {
        role: true,
      },
    });

    // Count users per role
    const roleCounts = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Define default roles with their permissions
    const defaultRoles = [
      {
        id: "super_admin",
        name: "Super Admin",
        description: "Full system access with all permissions",
        permissions: [
          "user.create",
          "user.read",
          "user.update",
          "user.delete",
          "user.ban",
          "user.reset_password",
          "counter.create",
          "counter.read",
          "counter.update",
          "counter.delete",
          "counter.assign",
          "token.create",
          "token.read",
          "token.update",
          "analytics.read",
          "settings.read",
          "settings.update",
        ],
        userCount: roleCounts["super_admin"] || 0,
      },
      {
        id: "admin",
        name: "Admin",
        description: "Administrative access with most permissions",
        permissions: [
          "user.create",
          "user.read",
          "user.update",
          "user.delete",
          "user.ban",
          "user.reset_password",
          "counter.create",
          "counter.read",
          "counter.update",
          "counter.delete",
          "counter.assign",
          "token.create",
          "token.read",
          "token.update",
          "analytics.read",
        ],
        userCount: roleCounts["admin"] || 0,
      },
      {
        id: "staff",
        name: "Staff",
        description: "Basic staff access for counter operations",
        permissions: [
          "counter.read",
          "token.create",
          "token.read",
          "token.update",
        ],
        userCount: roleCounts["staff"] || 0,
      },
    ];

    res.json({
      success: true,
      message: "Roles retrieved successfully",
      data: defaultRoles,
    });
  })
);

/**
 * @swagger
 * /api/roles:
 *   post:
 *     tags: [Role Management]
 *     summary: Create a new role
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - name
 *                 - description
 *                 - permissions
 *               properties:
 *                 name:
 *                   type: string
 *                   description: Role name
 *                 description:
 *                   type: string
 *                   description: Role description
 *                 permissions:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: List of permissions
 *     responses:
 *       201:
 *         description: Role created successfully
 *       400:
 *         description: Invalid input data
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  "/",
  authenticate,
  authorize([UserRole.super_admin]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const validatedData = createRoleSchema.parse(req.body);

    // For now, we only support default roles
    // Custom role creation would require a Role model in the database
    return res.status(400).json({
      success: false,
      message:
        "Custom role creation not supported. Only default roles (super_admin, admin, staff) are available.",
    });
  })
);

/**
 * @swagger
 * /api/roles/{roleId}:
 *   get:
 *     tags: [Role Management]
 *     summary: Get role by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Role retrieved successfully
 *       404:
 *         description: Role not found
 */
router.get(
  "/:roleId",
  authenticate,
  authorize([UserRole.admin, UserRole.super_admin]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { roleId } = req.params;

    // Check if it's a default role
    const defaultRoles = ["super_admin", "admin", "staff"];
    if (defaultRoles.includes(roleId)) {
      // Return default role info
      const roleInfo = {
        id: roleId,
        name:
          roleId === "super_admin"
            ? "Super Admin"
            : roleId === "admin"
            ? "Admin"
            : "Staff",
        description:
          roleId === "super_admin"
            ? "Full system access"
            : roleId === "admin"
            ? "Administrative access"
            : "Basic staff access",
        permissions:
          roleId === "super_admin"
            ? [
                "user.create",
                "user.read",
                "user.update",
                "user.delete",
                "user.ban",
                "user.reset_password",
                "counter.create",
                "counter.read",
                "counter.update",
                "counter.delete",
                "counter.assign",
                "token.create",
                "token.read",
                "token.update",
                "analytics.read",
                "settings.read",
                "settings.update",
              ]
            : roleId === "admin"
            ? [
                "user.create",
                "user.read",
                "user.update",
                "user.delete",
                "user.ban",
                "user.reset_password",
                "counter.create",
                "counter.read",
                "counter.update",
                "counter.delete",
                "counter.assign",
                "token.create",
                "token.read",
                "token.update",
                "analytics.read",
              ]
            : ["counter.read", "token.create", "token.read", "token.update"],
        userCount: 0, // Would need to count from users table
      };

      res.json({
        success: true,
        message: "Role retrieved successfully",
        data: roleInfo,
      });
      return;
    }

    // For custom roles, we would need a Role model in the database
    // For now, only default roles are supported
    return res.status(404).json({
      success: false,
      message:
        "Role not found. Only default roles (super_admin, admin, staff) are supported.",
    });
  })
);

/**
 * @swagger
 * /api/roles/{roleId}:
 *   put:
 *     tags: [Role Management]
 *     summary: Update role
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 permissions:
 *                   type: array
 *                   items:
 *                     type: string
 *     responses:
 *       200:
 *         description: Role updated successfully
 *       404:
 *         description: Role not found
 *       403:
 *         description: Insufficient permissions
 */
router.put(
  "/:roleId",
  authenticate,
  authorize([UserRole.super_admin]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { roleId } = req.params;
    const validatedData = updateRoleSchema.parse(req.body);

    // Check if it's a default role (cannot be modified)
    const defaultRoles = ["super_admin", "admin", "staff"];
    if (defaultRoles.includes(roleId)) {
      return res.status(400).json({
        success: false,
        message: "Cannot modify default roles",
      });
    }

    // For custom roles, we would need a Role model in the database
    // For now, only default roles are supported and they cannot be modified
    return res.status(400).json({
      success: false,
      message:
        "Role modification not supported. Only default roles (super_admin, admin, staff) are available.",
    });
  })
);

/**
 * @swagger
 * /api/roles/{roleId}:
 *   delete:
 *     tags: [Role Management]
 *     summary: Delete role
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Role deleted successfully
 *       404:
 *         description: Role not found
 *       400:
 *         description: Cannot delete role with assigned users
 *       403:
 *         description: Insufficient permissions
 */
router.delete(
  "/:roleId",
  authenticate,
  authorize([UserRole.super_admin]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { roleId } = req.params;

    // Check if it's a default role (cannot be deleted)
    const defaultRoles = ["super_admin", "admin", "staff"];
    if (defaultRoles.includes(roleId)) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete default roles",
      });
    }

    // For custom roles, we would need a Role model in the database
    // For now, only default roles are supported and they cannot be deleted
    return res.status(400).json({
      success: false,
      message:
        "Role deletion not supported. Only default roles (super_admin, admin, staff) are available.",
    });
  })
);

export { router as rolesRouter };
