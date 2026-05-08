import tkinter as tk
import math

DEFAULT_WORK_MIN = 25
DEFAULT_BREAK_MIN = 5

THEME = {
    "work": {
        "bg":        "#1a1a2e",
        "ring_fg":   "#e94560",
        "ring_bg":   "#2d2d44",
        "text":      "#e94560",
        "btn_start": "#e94560",
        "btn_hover": "#c73652",
        "label":     "#ff6b8a",
    },
    "break": {
        "bg":        "#0f2027",
        "ring_fg":   "#2ecc71",
        "ring_bg":   "#1a3a2a",
        "text":      "#2ecc71",
        "btn_start": "#2ecc71",
        "btn_hover": "#27ae60",
        "label":     "#55efc4",
    },
}

CANVAS_SIZE = 300
RING_PADDING = 30
BTN_RESET_COLOR = "#4a4a6a"
BTN_RESET_HOVER = "#5a5a7a"
BTN_SETTINGS_COLOR = "#3a3a5a"
BTN_SETTINGS_HOVER = "#4a4a6a"

IDLE    = "idle"
RUNNING = "running"
PAUSED  = "paused"
BREAK   = "break"


class SettingsDialog(tk.Toplevel):
    def __init__(self, parent, work_min, break_min, callback):
        super().__init__(parent)
        self._callback = callback
        self.title("设置")
        self.resizable(False, False)
        self.configure(bg="#1a1a2e")
        self.grab_set()

        w, h = 300, 230
        px = parent.winfo_x() + (parent.winfo_width()  - w) // 2
        py = parent.winfo_y() + (parent.winfo_height() - h) // 2
        self.geometry(f"{w}x{h}+{px}+{py}")

        self._build(work_min, break_min)

    def _build(self, work_min, break_min):
        tk.Label(
            self, text="时间设置", bg="#1a1a2e", fg="#ffffff",
            font=("Segoe UI", 14, "bold")
        ).pack(pady=(20, 12))

        for label_text, var_default, lo, hi, attr in [
            ("工作时长（分钟）", work_min,  1, 120, "_work_var"),
            ("休息时长（分钟）", break_min, 1,  60, "_break_var"),
        ]:
            row = tk.Frame(self, bg="#1a1a2e")
            row.pack(fill="x", padx=24, pady=6)
            tk.Label(
                row, text=label_text, bg="#1a1a2e", fg="#cccccc",
                font=("Segoe UI", 10), anchor="w"
            ).pack(side="left", expand=True, fill="x")
            var = tk.IntVar(value=var_default)
            setattr(self, attr, var)
            tk.Spinbox(
                row, from_=lo, to=hi, textvariable=var,
                width=5, font=("Segoe UI", 11),
                bg="#2d2d44", fg="#ffffff", buttonbackground="#3a3a5a",
                relief="flat", highlightthickness=1, highlightcolor="#e94560"
            ).pack(side="right")

        btn_frame = tk.Frame(self, bg="#1a1a2e")
        btn_frame.pack(pady=18)

        for text, bg, hover, cmd in [
            ("确认", "#e94560", "#c73652", self._confirm),
            ("取消", "#4a4a6a", "#5a5a7a", self.destroy),
        ]:
            b = tk.Button(
                btn_frame, text=text, bg=bg, fg="#ffffff",
                relief="flat", font=("Segoe UI", 10, "bold"),
                cursor="hand2", command=cmd, padx=16, pady=6,
                activebackground=hover, activeforeground="#ffffff",
                borderwidth=0
            )
            b.pack(side="left", padx=6)
            b.bind("<Enter>", lambda e, btn=b, c=hover: btn.configure(bg=c))
            b.bind("<Leave>", lambda e, btn=b, c=bg:    btn.configure(bg=c))

    def _confirm(self):
        try:
            w = max(1, min(120, self._work_var.get()))
            b = max(1, min(60,  self._break_var.get()))
        except tk.TclError:
            return
        self._callback(w, b)
        self.destroy()


class PomodoroApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.work_min  = DEFAULT_WORK_MIN
        self.break_min = DEFAULT_BREAK_MIN

        self._state     = IDLE
        self._remaining = self.work_min * 60
        self._total     = self.work_min * 60
        self._after_id  = None
        self._session   = 0

        self._setup_window()
        self._build_ui()
        self._update_display()

    def _setup_window(self):
        self.title("番茄钟")
        self.resizable(False, False)
        self.configure(bg=THEME["work"]["bg"])
        w, h = 380, 520
        sw = self.winfo_screenwidth()
        sh = self.winfo_screenheight()
        self.geometry(f"{w}x{h}+{(sw - w) // 2}+{(sh - h) // 2}")

    def _build_ui(self):
        self._title_lbl = tk.Label(
            self, text="POMODORO", bg=THEME["work"]["bg"],
            fg="#555577", font=("Segoe UI", 11, "bold")
        )
        self._title_lbl.pack(pady=(24, 0))

        self._canvas = tk.Canvas(
            self, width=CANVAS_SIZE, height=CANVAS_SIZE,
            bg=THEME["work"]["bg"], highlightthickness=0
        )
        self._canvas.pack(pady=(8, 0))

        self._state_lbl = tk.Label(
            self, text="准备开始", bg=THEME["work"]["bg"],
            fg=THEME["work"]["label"], font=("Segoe UI", 12)
        )
        self._state_lbl.pack(pady=(4, 0))

        self._session_lbl = tk.Label(
            self, text="今日番茄: 0", bg=THEME["work"]["bg"],
            fg="#555577", font=("Segoe UI", 9)
        )
        self._session_lbl.pack(pady=(2, 0))

        btn_frame = tk.Frame(self, bg=THEME["work"]["bg"])
        btn_frame.pack(pady=20)
        self._btn_frame = btn_frame

        self._start_btn = self._make_btn(
            btn_frame, "开始",
            THEME["work"]["btn_start"], THEME["work"]["btn_hover"],
            self.start_pause
        )
        self._start_btn.pack(side="left", padx=8)

        self._reset_btn = self._make_btn(
            btn_frame, "重置",
            BTN_RESET_COLOR, BTN_RESET_HOVER, self.reset
        )
        self._reset_btn.pack(side="left", padx=8)

        self._settings_btn = self._make_btn(
            btn_frame, "设置",
            BTN_SETTINGS_COLOR, BTN_SETTINGS_HOVER, self.open_settings
        )
        self._settings_btn.pack(side="left", padx=8)

    def _make_btn(self, parent, text, bg, hover, command):
        btn = tk.Button(
            parent, text=text, bg=bg, fg="#ffffff",
            relief="flat", font=("Segoe UI", 10, "bold"),
            cursor="hand2", command=command,
            padx=18, pady=8,
            activebackground=hover, activeforeground="#ffffff",
            borderwidth=0
        )
        btn.bind("<Enter>", lambda e, b=btn, c=hover: b.configure(bg=c))
        btn.bind("<Leave>", lambda e, b=btn, c=bg:    b.configure(bg=c))
        return btn

    def _draw_ring(self, progress, theme_key):
        c = self._canvas
        c.delete("all")
        t = THEME[theme_key]

        cx = cy = CANVAS_SIZE // 2
        r  = cx - RING_PADDING
        x0, y0 = cx - r, cy - r
        x1, y1 = cx + r, cy + r

        # 背景环
        c.create_arc(
            x0, y0, x1, y1,
            start=90, extent=-359.99,
            style=tk.ARC, outline=t["ring_bg"], width=14
        )

        # 进度弧
        if progress > 0.001:
            c.create_arc(
                x0, y0, x1, y1,
                start=90, extent=-(progress * 359.99),
                style=tk.ARC, outline=t["ring_fg"], width=14
            )

        # 端点圆点
        if 0.001 < progress < 0.999:
            angle = math.radians(90 - progress * 360)
            dot_x = cx + r * math.cos(angle)
            dot_y = cy - r * math.sin(angle)
            dr = 7
            c.create_oval(
                dot_x - dr, dot_y - dr, dot_x + dr, dot_y + dr,
                fill=t["ring_fg"], outline=""
            )

        # 时间文字
        mins = self._remaining // 60
        secs = self._remaining % 60
        c.create_text(
            cx, cy - 10,
            text=f"{mins:02d}:{secs:02d}",
            fill=t["text"],
            font=("Segoe UI", 52, "bold")
        )
        c.create_text(
            cx, cy + 38,
            text="MIN  :  SEC",
            fill="#444466",
            font=("Segoe UI", 8)
        )

    def _update_display(self):
        is_break  = self._state == BREAK
        theme_key = "break" if is_break else "work"
        t = THEME[theme_key]

        progress = self._remaining / self._total if self._total > 0 else 1.0
        self._draw_ring(progress, theme_key)

        bg = t["bg"]
        self.configure(bg=bg)
        self._canvas.configure(bg=bg)
        self._title_lbl.configure(bg=bg)
        self._state_lbl.configure(bg=bg)
        self._session_lbl.configure(bg=bg)
        self._btn_frame.configure(bg=bg)

        state_text = {
            IDLE:    "准备开始",
            RUNNING: "工作中...",
            PAUSED:  "已暂停",
            BREAK:   "休息中...",
        }[self._state]
        self._state_lbl.configure(text=state_text, fg=t["label"])

        btn_text = (
            "继续" if self._state == PAUSED else
            "暂停" if self._state in (RUNNING, BREAK) else
            "开始"
        )
        self._start_btn.configure(
            text=btn_text, bg=t["btn_start"],
            activebackground=t["btn_hover"]
        )
        self._start_btn.bind(
            "<Enter>", lambda e: self._start_btn.configure(bg=t["btn_hover"]))
        self._start_btn.bind(
            "<Leave>", lambda e: self._start_btn.configure(bg=t["btn_start"]))

        self._session_lbl.configure(text=f"今日番茄: {self._session}")

    def _tick(self):
        if self._state not in (RUNNING, BREAK):
            return
        self._remaining -= 1
        if self._remaining <= 0:
            self._on_timer_end()
        else:
            self._update_display()
            self._after_id = self.after(1000, self._tick)

    def _on_timer_end(self):
        if self._state == RUNNING:
            self._session  += 1
            self._state     = BREAK
            self._remaining = self.break_min * 60
            self._total     = self.break_min * 60
            self._notify("休息时间！")
        else:
            self._state     = RUNNING
            self._remaining = self.work_min * 60
            self._total     = self.work_min * 60
            self._notify("开始工作！")
        self._update_display()
        self._after_id = self.after(1000, self._tick)

    def _notify(self, msg):
        self.title(f"番茄钟 — {msg}")
        self.after(3000, lambda: self.title("番茄钟"))
        self.bell()

    def start_pause(self):
        if self._state == IDLE:
            self._state    = RUNNING
            self._after_id = self.after(1000, self._tick)
        elif self._state == RUNNING:
            self._state = PAUSED
            if self._after_id:
                self.after_cancel(self._after_id)
                self._after_id = None
        elif self._state == PAUSED:
            self._state    = RUNNING
            self._after_id = self.after(1000, self._tick)
        elif self._state == BREAK:
            self._state = PAUSED
            if self._after_id:
                self.after_cancel(self._after_id)
                self._after_id = None
        self._update_display()

    def reset(self):
        if self._after_id:
            self.after_cancel(self._after_id)
            self._after_id = None
        self._state     = IDLE
        self._remaining = self.work_min * 60
        self._total     = self.work_min * 60
        self._update_display()

    def open_settings(self):
        def apply(w, b):
            self.work_min  = w
            self.break_min = b
            if self._state == IDLE:
                self._remaining = w * 60
                self._total     = w * 60
            self._update_display()
        SettingsDialog(self, self.work_min, self.break_min, apply)


if __name__ == "__main__":
    PomodoroApp().mainloop()
