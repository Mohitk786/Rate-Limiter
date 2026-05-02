import type { Request } from "express";


export const getKey = (req:Request) => {
  const apiKey = req.headers["x-api-key"];
  const userId = req.headers["x-user-id"];

  if (apiKey) return `tb:api:${apiKey}`;
  if (userId) return `tb:user:${userId}`;
  return `tb:ip:${req.ip}`;
};