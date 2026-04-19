"use client";

import { useEffect } from "react";

const ASSETS = {
  tuanxiaoman: "/mascot/tuanxiaoman.png",
  lulu: "/mascot/lulu.png",
};

// 文案池
const WELCOME = ["欢迎回来~", "今天想分享点什么?", "记得带上好原型!", "我一直在这里陪你~", "今天状态满格呀"];
const CLICK = ["戳我干嘛呀~", "好痒好痒!", "Hi~", "摸摸头摸摸头", "要抱抱吗?", "嘿嘿嘿~", "你来啦!"];
const CASTING = ["正在托管中…", "努力处理中…", "马上就好~", "稍等一下下~", "我在帮你传哦"];
const SUCCESS = ["✨ 完成啦!", "看看效果!", "搞定~", "这波稳了!", "🎉 完美!", "可以分享啦"];
const ERROR = ["哎呀出错了", "再试一次?", "换个姿势?", "有点小问题…", "再来一次~"];

// 不要把 upload-chunk 加进来（上传一次会触发几百次，太吵）
// finalize/login/admin 这些低频关键事件才追踪
const TRACKED_API = [
  "/api/prototypes/finalize",
  "/api/auth/login",
];
const SILENT_API = ["/api/prototypes/upload-chunk", "/api/assets"];

type MascotState = {
  tuanxiaoman: { el: HTMLElement | null; img: HTMLImageElement | null; bubble: HTMLElement | null; bubbleTimer: number | null; stateTimer: number | null };
  lulu: { el: HTMLElement | null; img: HTMLImageElement | null; bubble: HTMLElement | null; bubbleTimer: number | null };
};

declare global {
  interface Window {
    Mascot?: any;
    __mascotInit?: boolean;
  }
}

/** 全局挂载组件：在 RootLayout 里用一次即可。实际渲染的是一个客户端 effect。 */
export function Mascot() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.__mascotInit) return;
    window.__mascotInit = true;

    const state: MascotState = {
      tuanxiaoman: { el: null, img: null, bubble: null, bubbleTimer: null, stateTimer: null },
      lulu: { el: null, img: null, bubble: null, bubbleTimer: null },
    };

    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

    function mountTuanxiaoman() {
      if (state.tuanxiaoman.el) return;
      const container = document.createElement("div");
      container.className = "mascot mascot-tuanxiaoman";
      container.innerHTML = `
        <div class="mascot-bubble" style="display:none"></div>
        <img class="mascot-img" src="${ASSETS.tuanxiaoman}" alt="团小满" draggable="false">
      `;
      document.body.appendChild(container);

      const img = container.querySelector(".mascot-img") as HTMLImageElement;
      const bubble = container.querySelector(".mascot-bubble") as HTMLElement;
      state.tuanxiaoman.el = container;
      state.tuanxiaoman.img = img;
      state.tuanxiaoman.bubble = bubble;

      const onFail = () => {
        if (container.dataset.failed) return;
        container.dataset.failed = "1";
      };
      img.addEventListener("error", onFail, { once: true });
      img.addEventListener("load", () => {
        if (img.naturalWidth === 0) onFail();
      }, { once: true });

      img.addEventListener("click", (e) => {
        e.stopPropagation();
        say("tuanxiaoman", pick(CLICK));
        triggerAnim(container, "bounce", 600);
      });

      document.addEventListener("mousemove", (e) => {
        if (!container.isConnected || container.dataset.failed) return;
        if (["bounce", "celebrate", "sad", "casting"].some(c => container.classList.contains(c))) return;
        const rect = container.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const dx = e.clientX - cx;
        const tilt = Math.max(-5, Math.min(5, dx / 30));
        if (!container.matches(":hover")) {
          img.style.transform = `rotate(${tilt}deg)`;
        }
      }, { passive: true });

      document.addEventListener("mouseleave", () => {
        if (img) img.style.transform = "";
      });
    }

    function say(who: "tuanxiaoman" | "lulu", text: string, duration = 3800) {
      const s = state[who];
      if (!s?.bubble) return;
      if (s.el?.dataset?.failed) return;
      if (s.bubbleTimer) clearTimeout(s.bubbleTimer);
      s.bubble.textContent = text;
      s.bubble.style.display = "block";
      s.bubble.classList.remove("fade-out");
      s.bubble.classList.add("fade-in");
      s.bubbleTimer = window.setTimeout(() => {
        if (!s.bubble) return;
        s.bubble.classList.remove("fade-in");
        s.bubble.classList.add("fade-out");
        window.setTimeout(() => { if (s.bubble) s.bubble.style.display = "none"; }, 260);
      }, duration);
    }

    function triggerAnim(el: HTMLElement, klass: string, durationMs: number) {
      if (state.tuanxiaoman.stateTimer) clearTimeout(state.tuanxiaoman.stateTimer);
      el.classList.remove("bounce", "casting", "celebrate", "sad");
      void el.offsetWidth;
      el.classList.add(klass);
      state.tuanxiaoman.stateTimer = window.setTimeout(() => {
        el.classList.remove(klass);
      }, durationMs);
    }

    function onCasting() {
      if (!state.tuanxiaoman.el) return;
      state.tuanxiaoman.el.classList.add("casting");
      say("tuanxiaoman", pick(CASTING), 10000);
    }

    function onSuccess() {
      if (!state.tuanxiaoman.el) return;
      state.tuanxiaoman.el.classList.remove("casting");
      triggerAnim(state.tuanxiaoman.el, "celebrate", 800);
      say("tuanxiaoman", pick(SUCCESS), 2800);
    }

    function onError() {
      if (!state.tuanxiaoman.el) return;
      state.tuanxiaoman.el.classList.remove("casting");
      triggerAnim(state.tuanxiaoman.el, "sad", 1200);
      say("tuanxiaoman", pick(ERROR), 3200);
    }

    // 包装 fetch：遇到关键 API 自动触发状态
    const origFetch = window.fetch.bind(window);
    window.fetch = async function mascotFetch(input: any, init?: any) {
      const url = typeof input === "string" ? input : input?.url || "";
      if (SILENT_API.some(p => url.includes(p))) {
        return origFetch(input, init);
      }
      const tracked = TRACKED_API.some(p => url.includes(p));
      if (tracked) onCasting();
      try {
        const res = await origFetch(input, init);
        if (tracked) {
          if (res.ok) {
            window.setTimeout(() => {
              if (Math.random() < 0.5) onSuccess();
              else state.tuanxiaoman.el?.classList.remove("casting");
            }, 300);
          } else {
            window.setTimeout(onError, 300);
          }
        }
        return res;
      } catch (err) {
        if (tracked) window.setTimeout(onError, 300);
        throw err;
      }
    };

    // 公开给页面使用
    window.Mascot = {
      say, onCasting, onSuccess, onError,
      mountLulu: (container: HTMLElement, opts?: { size?: number }) => {
        if (!container) return null;
        const size = opts?.size || 90;
        const lulu = document.createElement("div");
        lulu.className = "mascot mascot-lulu enter";
        lulu.style.width = size + "px";
        lulu.style.height = size * 1.35 + "px";
        lulu.innerHTML = `
          <div class="mascot-bubble" style="display:none"></div>
          <img class="mascot-img" src="${ASSETS.lulu}" alt="露露" draggable="false">
        `;
        container.appendChild(lulu);
        const img = lulu.querySelector(".mascot-img") as HTMLImageElement;
        const onFail = () => { if (!lulu.dataset.failed) lulu.dataset.failed = "1"; };
        img.addEventListener("error", onFail, { once: true });
        img.addEventListener("load", () => { if (img.naturalWidth === 0) onFail(); }, { once: true });
        window.setTimeout(() => lulu.classList.remove("enter"), 700);
        state.lulu.el = lulu;
        state.lulu.img = img;
        state.lulu.bubble = lulu.querySelector(".mascot-bubble") as HTMLElement;
        return lulu;
      },
    };

    // 启动
    mountTuanxiaoman();
    window.setTimeout(() => say("tuanxiaoman", pick(WELCOME), 3500), 1200);
  }, []);

  return null;
}
