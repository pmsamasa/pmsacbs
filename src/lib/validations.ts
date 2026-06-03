import { z } from "zod";

export const accountTypeSchema = z.enum(["saving", "current", "fixed"]);
export const methodSchema = z.enum(["liquid", "online"]);

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const customerCreateSchema = z.object({
  cic_no: z.string().trim().min(2).max(32).regex(/^[A-Za-z0-9_-]+$/),
  name: z.string().trim().min(1).max(120).optional().or(z.literal("")),
  class_name: z.string().trim().max(80).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  account_types: z.array(accountTypeSchema).min(1),
  service_charge: z.coerce.number().min(0).default(20),
  service_charge_method: methodSchema.default("liquid"),
  opened_at: z.string().min(1),
});

export const transactionSchema = z.object({
  customer_id: z.string().uuid(),
  account_type: accountTypeSchema,
  transaction_type: z.enum(["credit", "debit"]),
  method: methodSchema,
  amount: z.coerce.number().positive().max(99999999),
  note: z.string().trim().max(500).optional().or(z.literal("")),
  withdrawal_request_id: z.string().uuid().optional().or(z.literal("")),
});

export const conversionSchema = z.object({
  from_method: methodSchema,
  to_method: methodSchema,
  amount: z.coerce.number().positive(),
  note: z.string().trim().max(300).optional().or(z.literal("")),
}).refine((data) => data.from_method !== data.to_method, "Choose different methods");

export const withdrawalRequestSchema = z.object({
  account_id: z.string().uuid(),
  request_type: z.enum(["fixed_full", "saving_full", "saving_early"]),
  amount: z.coerce.number().positive(),
  reason: z.string().trim().min(3).max(500),
});

export const incomeSchema = z.object({
  entry_type: z.enum(["credit", "debit"]),
  category: z.enum(["Service Charge", "Fine Collection", "Money Conversion", "To Committee", "Item Purchase"]),
  amount: z.coerce.number().positive(),
  method: methodSchema,
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export const customerUpdateSchema = z.object({
  customer_id: z.string().uuid(),
  name: z.string().trim().max(120).optional().or(z.literal("")),
  class_name: z.string().trim().max(80).optional().or(z.literal("")),
});

export const customerDeleteSchema = z.object({
  customer_id: z.string().uuid(),
  confirmation: z.string().trim(),
});

export const bulkClassSchema = z.object({
  from_class: z.string().trim().min(1),
  to_class: z.string().trim().min(1),
  confirmation: z.string().trim().optional().or(z.literal("")),
});

export const profileSchema = z.object({
  name: z.string().trim().max(120).optional().or(z.literal("")),
  class_name: z.string().trim().max(80).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  cic_no: z.string().trim().min(2).max(32).optional(),
  assistant_manager_name: z.string().trim().max(120).optional().or(z.literal("")),
  assistant_manager_cic_no: z.string().trim().max(32).optional().or(z.literal("")),
  assistant_manager_class: z.string().trim().max(80).optional().or(z.literal("")),
  assistant_manager_phone: z.string().trim().max(30).optional().or(z.literal("")),
  assistant_manager_email: z.string().email().optional().or(z.literal("")),
});

export const broadcastNotificationSchema = z.object({
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(3).max(1000),
  message_date: z.string().trim().min(1),
  confirmed_by_manager: z.literal("on").or(z.literal("true")),
});

export const handoverSchema = z.object({
  new_period_name: z.string().trim().min(2).max(80),
  new_manager_name: z.string().trim().min(2).max(120),
  new_manager_cic_no: z.string().trim().min(2).max(32).regex(/^[A-Za-z0-9_-]+$/),
  new_manager_class: z.string().trim().max(80).optional().or(z.literal("")),
  new_manager_phone: z.string().trim().max(30).optional().or(z.literal("")),
  new_manager_email: z.string().email(),
  new_manager_password: z.string().min(6),
});
