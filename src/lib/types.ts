export type Role = "super_admin" | "user";

export type User = {
  id: string;
  phone: string;
  name: string;
  passwordHash: string;
  role: Role;
  visibleProjectIds: string[]; // 空数组 = 可见全部（super_admin 永远全量）
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
};

export type Prototype = {
  id: string;
  slug: string;                // 子域名/路径用，小写字母数字和横线
  name: string;
  description: string;
  coverUrl: string | null;     // 封面图地址（R2 或本地）
  coverCustom: boolean;        // 是否用户自定义（true）或系统自动生成（false）
  accessPassword: string | null; // 独立访问密码，null 表示无
  entryFile: string;           // 入口文件名，默认 index.html
  sizeBytes: number;
  fileCount: number;
  uploadedBy: string;          // user id
  createdAt: number;
  updatedAt: number;
  archived: boolean;
};

export type Session = {
  userId: string;
  role: Role;
  loggedInAt: number;
};

export type StatEvent = {
  prototypeId: string;
  timestamp: number;
  visitorId: string;  // 游客 cookie id
  userAgent?: string;
  ip?: string;
};

export type PrototypeStats = {
  totalPV: number;
  totalUV: number;
  last7Days: { date: string; pv: number; uv: number }[];
};
