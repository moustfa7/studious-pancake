import React, { useState, useEffect, useRef } from "react";

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&family=JetBrains+Mono:wght@400;600;700&display=swap');
`;

const COLORS = {
  ink: "#14171F",
  ink2: "#1B1F2A",
  paper: "#F4EEDC",
  paperDim: "#E9E0C6",
  gold: "#D8A93B",
  goldDim: "#B48A2E",
  teal: "#1F6F5C",
  danger: "#C0473A",
  muted: "#6B5F45",
  line: "#D9CDA6",
};

const ADMIN_PASSWORD = "organizer123"; // غيّرها في الكود لو حابب

function normalizePhone(p) {
  return (p || "").replace(/[^\d]/g, "");
}

function makeTicketId() {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `EVT-${t}-${r}`;
}

function useRegistrations() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.storage.get("event-registrations", true);
      const list = res && res.value ? JSON.parse(res.value) : [];
      setLoading(false);
      return list;
    } catch (e) {
      setLoading(false);
      return [];
    }
  };
  const save = async (list) => {
    try {
      const res = await window.storage.set(
        "event-registrations",
        JSON.stringify(list),
        true
      );
      if (!res) throw new Error("save failed");
      return true;
    } catch (e) {
      setError("حصلت مشكلة في الحفظ، جرب تاني.");
      return false;
    }
  };
  return { load, save, loading, error };
}

function Perforation() {
  return (
    <div style={{ position: "relative", width: 0, alignSelf: "stretch" }}>
      <div
        style={{
          position: "absolute",
          top: -10,
          left: -9,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: COLORS.ink,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -10,
          left: -9,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: COLORS.ink,
        }}
      />
      <div
        style={{
          height: "100%",
          borderRight: `2px dashed ${COLORS.line}`,
        }}
      />
    </div>
  );
}

function VisitorView() {
  const { load, save } = useRegistrations();
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [status, setStatus] = useState("idle"); // idle | checking | done | error
  const [errorMsg, setErrorMsg] = useState("");
  const [ticket, setTicket] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const qrUrl = (data) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=340x340&margin=10&data=${encodeURIComponent(
      data
    )}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim()) {
      setErrorMsg("من فضلك املا كل الحقول.");
      return;
    }
    setStatus("checking");
    const list = await load();
    const normPhone = normalizePhone(form.phone);
    const normEmail = form.email.trim().toLowerCase();
    const existing = list.find(
      (r) =>
        normalizePhone(r.phone) === normPhone ||
        (r.email || "").trim().toLowerCase() === normEmail
    );
    if (existing) {
      setTicket(existing);
      setStatus("done");
      setErrorMsg("");
      return;
    }
    const newRecord = {
      id: makeTicketId(),
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      timestamp: new Date().toISOString(),
    };
    const updated = [...list, newRecord];
    const ok = await save(updated);
    if (!ok) {
      setStatus("error");
      return;
    }
    setTicket(newRecord);
    setStatus("done");
  };

  const handleDownload = async () => {
    if (!ticket) return;
    setDownloading(true);
    const data = JSON.stringify({
      id: ticket.id,
      name: ticket.name,
      phone: ticket.phone,
    });
    const url = qrUrl(data);
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = `ticket-${ticket.id}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
    } catch (e) {
      window.open(url, "_blank");
    }
    setDownloading(false);
  };

  if (status === "done" && ticket) {
    const data = JSON.stringify({
      id: ticket.id,
      name: ticket.name,
      phone: ticket.phone,
    });
    return (
      <div style={styles.centerWrap}>
        <div style={{ ...styles.eyebrow, marginBottom: 14 }}>
          {form.name || ticket.name ? "تذكرتك جاهزة" : ""}
        </div>
        <div style={styles.ticketOuter}>
          <div style={styles.ticketMain}>
            <div style={styles.ticketEyebrow}>تذكرة دخول</div>
            <div style={styles.ticketName}>{ticket.name}</div>
            <div style={styles.ticketRow}>
              <span style={styles.ticketLabel}>التليفون</span>
              <span style={styles.ticketMono}>{ticket.phone}</span>
            </div>
            <div style={styles.ticketRow}>
              <span style={styles.ticketLabel}>الإيميل</span>
              <span style={styles.ticketMono}>{ticket.email}</span>
            </div>
            <div style={{ ...styles.ticketRow, marginTop: "auto" }}>
              <span style={styles.ticketLabel}>الكود</span>
              <span style={styles.ticketMono}>{ticket.id}</span>
            </div>
          </div>
          <Perforation />
          <div style={styles.ticketStub}>
            <img
              src={qrUrl(data)}
              alt="QR code"
              style={{ width: 130, height: 130, borderRadius: 8 }}
            />
            <div style={styles.stubLabel}>امسحني عند البوابة</div>
          </div>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          style={styles.primaryBtn}
        >
          {downloading ? "بتنزل..." : "تحميل التذكرة"}
        </button>
        <div style={styles.hint}>
          لو التحميل ملقاش طريقه، هتفتحلك الصورة في تاب جديد — اضغط عليها
          مطولًا واحفظها.
        </div>
      </div>
    );
  }

  return (
    <div style={styles.centerWrap}>
      <div style={styles.eyebrow}>سجّل بياناتك</div>
      <h1 style={styles.h1}>احجز تذكرتك للدخول</h1>
      <p style={styles.sub}>
        دخّل اسمك ورقمك وإيميلك، وهتاخد QR خاص بيك تنزّله وتوريه على البوابة.
      </p>
      <form onSubmit={handleSubmit} style={styles.formCard}>
        <label style={styles.label}>الاسم بالكامل</label>
        <input
          style={styles.input}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="مثال: أحمد محمد"
        />
        <label style={styles.label}>رقم التليفون</label>
        <input
          style={styles.input}
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="01xxxxxxxxx"
        />
        <label style={styles.label}>الإيميل</label>
        <input
          style={styles.input}
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="name@example.com"
        />
        {errorMsg && <div style={styles.errorText}>{errorMsg}</div>}
        <button
          type="submit"
          disabled={status === "checking"}
          style={styles.primaryBtn}
        >
          {status === "checking" ? "بنتأكد من بياناتك..." : "احصل على تذكرتي"}
        </button>
        {status === "error" && (
          <div style={styles.errorText}>
            حصلت مشكلة، جرب تاني كمان شوية.
          </div>
        )}
      </form>
    </div>
  );
}

function AdminView() {
  const { load, error } = useRegistrations();
  const [authed, setAuthed] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const refresh = async () => {
    setLoading(true);
    const data = await load();
    setList(
      data.slice().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    );
    setLoading(false);
  };

  useEffect(() => {
    if (authed) refresh();
  }, [authed]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (pwd === ADMIN_PASSWORD) {
      setAuthed(true);
      setPwdError("");
    } else {
      setPwdError("كلمة السر غلط.");
    }
  };

  const exportCsv = () => {
    const header = ["الاسم", "رقم التليفون", "الإيميل", "الكود", "وقت التسجيل"];
    const rows = list.map((r) => [
      r.name,
      r.phone,
      r.email,
      r.id,
      new Date(r.timestamp).toLocaleString("ar-EG"),
    ]);
    const csv =
      "\uFEFF" +
      [header, ...rows]
        .map((row) => row.map((v) => `"${(v || "").replace(/"/g, '""')}"`).join(","))
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registrations-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const filtered = list.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      r.name.toLowerCase().includes(q) ||
      r.phone.includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q)
    );
  });

  if (!authed) {
    return (
      <div style={styles.centerWrap}>
        <div style={styles.eyebrow}>لوحة المنظم</div>
        <h1 style={styles.h1}>ادخل كلمة السر</h1>
        <form onSubmit={handleLogin} style={styles.formCard}>
          <label style={styles.label}>كلمة السر</label>
          <input
            type="password"
            style={styles.input}
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
          />
          {pwdError && <div style={styles.errorText}>{pwdError}</div>}
          <button type="submit" style={styles.primaryBtn}>
            دخول
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", maxWidth: 900, margin: "0 auto", padding: "0 16px" }}>
      <div style={styles.manifestHeader}>
        <div>
          <div style={styles.eyebrow}>سجل البوابة</div>
          <h1 style={{ ...styles.h1, marginBottom: 0 }}>لوحة المنظم</h1>
        </div>
        <div style={styles.countBox}>
          <div style={styles.countNum}>{loading ? "…" : list.length}</div>
          <div style={styles.countLabel}>مسجّل</div>
        </div>
      </div>

      <div style={styles.toolbar}>
        <input
          style={{ ...styles.input, maxWidth: 320 }}
          placeholder="دور بالاسم أو التليفون أو الإيميل..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={refresh} style={styles.secondaryBtn}>
            تحديث
          </button>
          <button onClick={exportCsv} style={styles.primaryBtnSm}>
            تصدير CSV
          </button>
        </div>
      </div>

      {error && <div style={styles.errorText}>{error}</div>}

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>الاسم</th>
              <th style={styles.th}>التليفون</th>
              <th style={styles.th}>الإيميل</th>
              <th style={styles.th}>الكود</th>
              <th style={styles.th}>وقت التسجيل</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td style={styles.td} colSpan={5}>
                  بيحمّل...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td style={styles.td} colSpan={5}>
                  لسه معندناش تسجيلات.
                </td>
              </tr>
            ) : (
              filtered.map((r, i) => (
                <tr key={r.id} style={{ background: i % 2 ? COLORS.ink2 : "transparent" }}>
                  <td style={styles.td}>{r.name}</td>
                  <td style={{ ...styles.td, fontFamily: "'JetBrains Mono', monospace" }}>
                    {r.phone}
                  </td>
                  <td style={styles.td}>{r.email}</td>
                  <td style={{ ...styles.td, fontFamily: "'JetBrains Mono', monospace", color: COLORS.gold }}>
                    {r.id}
                  </td>
                  <td style={styles.td}>
                    {new Date(r.timestamp).toLocaleString("ar-EG")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("visitor");

  return (
    <div dir="rtl" style={styles.page}>
      <style>{FONTS}</style>
      <nav style={styles.nav}>
        <div style={styles.brand}>🎫 بوابة الحدث</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setView("visitor")}
            style={view === "visitor" ? styles.navBtnActive : styles.navBtn}
          >
            تسجيل الزوار
          </button>
          <button
            onClick={() => setView("admin")}
            style={view === "admin" ? styles.navBtnActive : styles.navBtn}
          >
            لوحة المنظم
          </button>
        </div>
      </nav>
      <main style={styles.main}>
        {view === "visitor" ? <VisitorView /> : <AdminView />}
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: COLORS.ink,
    fontFamily: "'Tajawal', sans-serif",
    color: COLORS.paper,
  },
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "18px 24px",
    borderBottom: `1px solid ${COLORS.ink2}`,
  },
  brand: {
    fontWeight: 900,
    fontSize: 18,
    letterSpacing: 0.2,
  },
  navBtn: {
    background: "transparent",
    color: COLORS.paperDim,
    border: `1px solid ${COLORS.ink2}`,
    borderRadius: 8,
    padding: "8px 14px",
    fontFamily: "'Tajawal', sans-serif",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 14,
  },
  navBtnActive: {
    background: COLORS.gold,
    color: COLORS.ink,
    border: `1px solid ${COLORS.gold}`,
    borderRadius: 8,
    padding: "8px 14px",
    fontFamily: "'Tajawal', sans-serif",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 14,
  },
  main: {
    padding: "48px 16px 80px",
  },
  centerWrap: {
    maxWidth: 460,
    margin: "0 auto",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  eyebrow: {
    color: COLORS.gold,
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: "uppercase",
    fontFamily: "'JetBrains Mono', monospace",
  },
  h1: {
    fontSize: 30,
    fontWeight: 900,
    margin: "8px 0 6px",
  },
  sub: {
    color: COLORS.paperDim,
    fontSize: 15,
    marginBottom: 28,
    lineHeight: 1.7,
  },
  formCard: {
    width: "100%",
    background: COLORS.ink2,
    borderRadius: 16,
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    textAlign: "right",
    boxSizing: "border-box",
  },
  label: {
    fontSize: 13,
    color: COLORS.paperDim,
    marginTop: 12,
    marginBottom: 6,
    fontWeight: 700,
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 10,
    border: `1px solid ${COLORS.line}33`,
    background: COLORS.ink,
    color: COLORS.paper,
    fontFamily: "'Tajawal', sans-serif",
    fontSize: 15,
    boxSizing: "border-box",
    outline: "none",
  },
  primaryBtn: {
    marginTop: 20,
    background: COLORS.gold,
    color: COLORS.ink,
    border: "none",
    borderRadius: 10,
    padding: "14px 20px",
    fontWeight: 900,
    fontSize: 15,
    cursor: "pointer",
    fontFamily: "'Tajawal', sans-serif",
  },
  primaryBtnSm: {
    background: COLORS.gold,
    color: COLORS.ink,
    border: "none",
    borderRadius: 8,
    padding: "9px 16px",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "'Tajawal', sans-serif",
  },
  secondaryBtn: {
    background: "transparent",
    color: COLORS.paperDim,
    border: `1px solid ${COLORS.ink2}`,
    borderRadius: 8,
    padding: "9px 16px",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "'Tajawal', sans-serif",
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    marginTop: 10,
    fontWeight: 700,
  },
  hint: {
    color: COLORS.paperDim,
    fontSize: 12,
    marginTop: 14,
    maxWidth: 340,
    lineHeight: 1.6,
  },
  ticketOuter: {
    display: "flex",
    background: COLORS.paper,
    borderRadius: 18,
    overflow: "hidden",
    boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
    marginBottom: 24,
    width: "100%",
  },
  ticketMain: {
    flex: 1,
    padding: "22px 20px",
    display: "flex",
    flexDirection: "column",
    textAlign: "right",
    color: COLORS.ink,
    minHeight: 200,
  },
  ticketEyebrow: {
    color: COLORS.teal,
    fontWeight: 800,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    fontFamily: "'JetBrains Mono', monospace",
    marginBottom: 8,
  },
  ticketName: {
    fontSize: 20,
    fontWeight: 900,
    marginBottom: 14,
  },
  ticketRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
  },
  ticketLabel: {
    fontWeight: 700,
  },
  ticketMono: {
    fontFamily: "'JetBrains Mono', monospace",
    color: COLORS.ink,
  },
  ticketStub: {
    width: 160,
    background: COLORS.paperDim,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 10,
  },
  stubLabel: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: 700,
    textAlign: "center",
  },
  manifestHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 24,
    flexWrap: "wrap",
    gap: 16,
  },
  countBox: {
    background: COLORS.ink2,
    borderRadius: 12,
    padding: "10px 20px",
    textAlign: "center",
  },
  countNum: {
    fontSize: 28,
    fontWeight: 900,
    color: COLORS.gold,
    fontFamily: "'JetBrains Mono', monospace",
  },
  countLabel: {
    fontSize: 11,
    color: COLORS.paperDim,
    fontWeight: 700,
  },
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    flexWrap: "wrap",
    gap: 12,
  },
  tableWrap: {
    background: COLORS.ink2,
    borderRadius: 14,
    overflow: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 14,
  },
  th: {
    textAlign: "right",
    padding: "12px 16px",
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: 800,
    borderBottom: `1px solid ${COLORS.ink}`,
    fontFamily: "'JetBrains Mono', monospace",
  },
  td: {
    textAlign: "right",
    padding: "12px 16px",
    color: COLORS.paperDim,
  },
};
