"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { User } from "@/lib/types";

type ProtoRef = { id: string; name: string; slug: string };

export function UserManager({ initialUsers, prototypes }: { initialUsers: User[]; prototypes: ProtoRef[] }) {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({
    phone: "", name: "", password: "", visibleProjectIds: [] as string[], enabled: true,
  });

  function openAdd() {
    setEditing(null);
    setForm({ phone: "", name: "", password: "", visibleProjectIds: [], enabled: true });
    setModalOpen(true);
  }
  function openEdit(u: User) {
    setEditing(u);
    setForm({
      phone: u.phone, name: u.name, password: "",
      visibleProjectIds: u.visibleProjectIds || [], enabled: u.enabled,
    });
    setModalOpen(true);
  }

  async function save() {
    if (!/^1\d{10}$/.test(form.phone)) { toast.error("请输入 11 位有效手机号"); return; }
    if (!form.name.trim()) { toast.error("请输入姓名"); return; }
    if (!editing && !form.password) { toast.error("新增用户必须设置初始密码"); return; }
    if (form.password && form.password.length < 6) { toast.error("密码至少 6 位"); return; }

    const payload: any = {
      phone: form.phone,
      name: form.name.trim(),
      visibleProjectIds: form.visibleProjectIds,
      enabled: form.enabled,
    };
    if (form.password) payload.password = form.password;

    const url = editing ? `/api/admin/users/${editing.id}` : "/api/admin/users";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error || "保存失败"); return; }
    toast.success(editing ? "已保存" : "用户已创建");
    setModalOpen(false);
    refresh();
  }

  async function toggleEnabled(u: User) {
    if (u.role === "super_admin") { toast.error("不可停用超级管理员"); return; }
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !u.enabled }),
    });
    if (res.ok) { toast.success(u.enabled ? "已停用" : "已启用"); refresh(); }
  }

  async function remove(u: User) {
    if (u.role === "super_admin") { toast.error("不可删除超级管理员"); return; }
    if (!confirm(`确定删除 ${u.name} (${u.phone})？`)) return;
    const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("已删除"); refresh(); }
  }

  async function resetPassword(u: User) {
    const newPwd = prompt(`为 ${u.name} 重置密码，请输入新密码（至少 6 位）`);
    if (!newPwd) return;
    if (newPwd.length < 6) { toast.error("至少 6 位"); return; }
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPwd }),
    });
    if (res.ok) toast.success("密码已重置");
  }

  async function refresh() {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(data.users || []);
    router.refresh();
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={openAdd} className="btn btn-primary">+ 新增用户</button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600 border-b">
              <th className="text-left px-4 py-3 font-medium">姓名</th>
              <th className="text-left px-4 py-3 font-medium">手机号</th>
              <th className="text-left px-4 py-3 font-medium">角色</th>
              <th className="text-left px-4 py-3 font-medium">可见原型</th>
              <th className="text-left px-4 py-3 font-medium">状态</th>
              <th className="text-right px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">{u.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{u.phone}</td>
                <td className="px-4 py-3">
                  {u.role === "super_admin" ? <span className="tag tag-success">超级管理员</span> : <span className="tag tag-default">普通用户</span>}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {u.role === "super_admin"
                    ? "全部"
                    : u.visibleProjectIds.length === 0
                    ? "全部"
                    : `${u.visibleProjectIds.length} 个`}
                </td>
                <td className="px-4 py-3">
                  {u.enabled ? <span className="tag tag-success">启用</span> : <span className="tag tag-danger">停用</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-2">
                    <button onClick={() => openEdit(u)} className="text-primary hover:underline text-xs">编辑</button>
                    <button onClick={() => resetPassword(u)} className="text-primary hover:underline text-xs">重置密码</button>
                    {u.role !== "super_admin" && (
                      <>
                        <button onClick={() => toggleEnabled(u)} className="text-primary hover:underline text-xs">
                          {u.enabled ? "停用" : "启用"}
                        </button>
                        <button onClick={() => remove(u)} className="text-red-500 hover:underline text-xs">删除</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={6} className="text-center text-gray-400 py-12">还没有用户</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setModalOpen(false)}>
          <div className="card p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">{editing ? "编辑用户" : "新增用户"}</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">手机号 *</label>
                  <input className="input" value={form.phone} disabled={!!editing}
                    onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })}
                    maxLength={11} placeholder="11 位手机号" />
                </div>
                <div>
                  <label className="label">姓名 *</label>
                  <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">{editing ? "新密码（留空=不变）" : "初始密码 * (至少 6 位)"}</label>
                <input className="input" type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder={editing ? "不修改请留空" : "至少 6 位"} />
              </div>
              <div>
                <label className="label">可见原型（不选=可见全部）</label>
                <div className="max-h-40 overflow-y-auto border rounded p-2 grid grid-cols-2 gap-1">
                  {prototypes.length === 0 && <div className="text-xs text-gray-400 col-span-2 py-4 text-center">暂无原型</div>}
                  {prototypes.map(p => (
                    <label key={p.id} className="flex items-center gap-2 text-sm p-1 hover:bg-gray-50 rounded cursor-pointer">
                      <input type="checkbox" checked={form.visibleProjectIds.includes(p.id)}
                        onChange={e => {
                          const set = new Set(form.visibleProjectIds);
                          if (e.target.checked) set.add(p.id); else set.delete(p.id);
                          setForm({ ...form, visibleProjectIds: [...set] });
                        }} />
                      <span className="truncate">{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })} />
                <span className="text-sm">启用账号（停用后无法登录）</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setModalOpen(false)} className="btn btn-default">取消</button>
              <button onClick={save} className="btn btn-primary">保存</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
