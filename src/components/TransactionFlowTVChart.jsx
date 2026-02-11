import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { createChart, CrosshairMode, LineStyle } from 'lightweight-charts';

// Bucket points by minute so the chart looks like a proper time-series (not "per-row")
const bucketToMinute = (date) => {
  const d = new Date(date);
  d.setSeconds(0, 0);
  return Math.floor(d.getTime() / 1000); // seconds for lightweight-charts
};

const parseAmount = (v) => {
  const n = Number(v);
  // If backend ever returns negative amounts, ignore them for Transaction Flow chart
  // (user requirement: don't show negative values at all).
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n;
};

/**
 * TradingView-style Transaction Flow chart (pan/zoom built-in).
 * Expects raw rows.
 * If rows contain `flowType` ('payments' | 'fund-transfers'), it will render both on the same chart
 * as separate colored series, so they can "overlap" without being confusing.
 */
const TransactionFlowTVChart = forwardRef(function TransactionFlowTVChart({
  rows,
  getStatus,
  isSuccess,
  isPending,
  isLoading = false,
  height = 260, // fallback only; chart will auto-size to container
  theme = 'light',
  isFullscreen = false,
}, ref) {
  const wrapperRef = useRef(null);
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef({ success: null, failed: null });
  const tooltipRef = useRef(null);
  const loadingAnimRef = useRef({
    rafId: null,
    startSec: null,
    phase: 0,
    points: [],
    lastUpdateMs: 0,
  });
  const loadingBaselineRef = useRef({ baseline: 1, amp: 1 });

  const data = useMemo(() => {
    if (!Array.isArray(rows) || rows.length === 0) {
      return {
        paymentsSuccess: [],
        paymentsFailed: [],
        transfersSuccess: [],
        transfersFailed: [],
        // fallback (no type)
        success: [],
        failed: [],
      };
    }

    const hasType = rows.some((r) => r?.flowType === 'payments' || r?.flowType === 'fund-transfers');
    const buckets = new Map(); // time -> { payments:{success,failed}, transfers:{success,failed}, success, failed }

    for (const r of rows) {
      if (!r?.createdAt) continue;
      const t = bucketToMinute(r.createdAt);
      const status = getStatus(r);
      const amount = parseAmount(r.amount ?? r.amountInBaht ?? 0);
      if (amount <= 0) continue;

      const cur = buckets.get(t) || {
        payments: { success: 0, failed: 0 },
        transfers: { success: 0, failed: 0 },
        success: 0,
        failed: 0,
      };

      const isOk = isSuccess(status);
      const isFail = !isOk && !isPending(status);
      const type = r?.flowType === 'fund-transfers' ? 'transfers' : (r?.flowType === 'payments' ? 'payments' : null);

      if (hasType && type) {
        if (isOk) cur[type].success += amount;
        else if (isFail) cur[type].failed += amount;
      } else {
        if (isOk) cur.success += amount;
        else if (isFail) cur.failed += amount;
      }

      buckets.set(t, cur);
    }

    const times = Array.from(buckets.keys()).sort((a, b) => a - b);
    const mk = (getter) => times.map((time) => ({ time, value: getter(buckets.get(time)) })).filter((p) => p.value > 0);

    return {
      paymentsSuccess: mk((b) => b.payments.success),
      paymentsFailed: mk((b) => b.payments.failed),
      transfersSuccess: mk((b) => b.transfers.success),
      transfersFailed: mk((b) => b.transfers.failed),
      success: mk((b) => b.success),
      failed: mk((b) => b.failed),
      hasType,
    };
  }, [rows, getStatus, isSuccess, isPending]);

  const txByMinute = useMemo(() => {
    const map = new Map(); // time(seconds) -> tx[]
    if (!Array.isArray(rows)) return map;
    for (const r of rows) {
      if (!r?.createdAt) continue;
      const t = bucketToMinute(r.createdAt);
      const list = map.get(t) || [];
      list.push(r);
      map.set(t, list);
    }
    // Sort each bucket by amount desc for nicer tooltip
    for (const [t, list] of map.entries()) {
      list.sort((a, b) => parseAmount(b?.amount ?? b?.amountInBaht ?? 0) - parseAmount(a?.amount ?? a?.amountInBaht ?? 0));
      map.set(t, list);
    }
    return map;
  }, [rows]);

  useImperativeHandle(ref, () => ({
    zoomIn() {
      const chart = chartRef.current;
      if (!chart) return;
      const ts = chart.timeScale();
      const range = ts.getVisibleLogicalRange();
      if (!range) return;
      const mid = (range.from + range.to) / 2;
      const half = (range.to - range.from) / 2;
      const nextHalf = Math.max(5, half * 0.8);
      ts.setVisibleLogicalRange({ from: mid - nextHalf, to: mid + nextHalf });
    },
    zoomOut() {
      const chart = chartRef.current;
      if (!chart) return;
      const ts = chart.timeScale();
      const range = ts.getVisibleLogicalRange();
      if (!range) return;
      const mid = (range.from + range.to) / 2;
      const half = (range.to - range.from) / 2;
      const nextHalf = half * 1.25;
      ts.setVisibleLogicalRange({ from: mid - nextHalf, to: mid + nextHalf });
    },
    reset() {
      const chart = chartRef.current;
      if (!chart) return;
      // best reset behavior: default time scale + fit content
      chart.timeScale().resetTimeScale();
      chart.timeScale().fitContent();
    },
  }), []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create chart once
    const isDark = theme === 'dark';
    const sizeEl = wrapperRef.current || containerRef.current;
    const initialWidth = sizeEl?.clientWidth || containerRef.current.clientWidth || undefined;
    const initialHeight = sizeEl?.clientHeight || containerRef.current.clientHeight || height;
    const chart = createChart(containerRef.current, {
      width: initialWidth,
      height: initialHeight,
      layout: {
        background: { color: 'transparent' },
        textColor: isDark ? '#cbd5e1' : '#475569',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        fontSize: 12,
        // Hide TradingView attribution logo
        attributionLogo: false,
      },
      localization: {
        locale: 'th-TH',
        // Force 24-hour clock in crosshair/time tooltips
        timeFormatter: (time) => {
          const d = new Date(time * 1000);
          return d.toLocaleString('th-TH', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });
        },
      },
      watermark: {
        visible: false,
      },
      grid: {
        vertLines: { color: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.18)' },
        horzLines: { color: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.18)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { style: LineStyle.Solid, color: isDark ? 'rgba(148,163,184,0.35)' : 'rgba(100,116,139,0.35)' },
        horzLine: { style: LineStyle.Solid, color: isDark ? 'rgba(148,163,184,0.35)' : 'rgba(100,116,139,0.35)' },
      },
      rightPriceScale: {
        borderVisible: false,
        // Prevent visual padding that can make the scale show negative ticks
        scaleMargins: { top: 0.2, bottom: 0 },
      },
      timeScale: {
        borderVisible: false,
        rightOffset: 2,
        fixLeftEdge: true,
        fixRightEdge: true,
        timeVisible: true,
        secondsVisible: false,
        // Force 24-hour clock on axis tick labels
        tickMarkFormatter: (time) => {
          const d = new Date(time * 1000);
          return d.toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });
        },
      },
      handleScroll: true,
      // Allow scaling time (zoom) but prevent y-axis scaling/panning into negative space via axis drag.
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: { time: true, price: false },
        axisDoubleClickReset: { time: true, price: true },
      },
    });

    const baseAutoscale = (original) => {
      const res = original?.();
      const maxValue = res?.priceRange?.maxValue ?? 1;
      return {
        priceRange: { minValue: 0, maxValue: Math.max(1, maxValue) },
        margins: { above: 10, below: 0 },
      };
    };

    // Encode type + status using BOTH color + line style (easier to read than color alone):
    // - Payments: solid
    // - Fund Transfers: dotted
    // - Failed: dashed
    const paymentsSuccess = chart.addAreaSeries({
      lineColor: '#16a34a',
      topColor: 'rgba(22,163,74,0.28)',
      bottomColor: 'rgba(34,197,94,0.02)',
      lineWidth: 3,
      lineStyle: LineStyle.Solid,
      title: 'Buy (Success)',
      autoscaleInfoProvider: baseAutoscale,
    });
    const paymentsFailed = chart.addLineSeries({
      color: '#ef4444',
      lineWidth: 3,
      lineStyle: LineStyle.Dashed,
      title: 'Buy (Failed)',
      autoscaleInfoProvider: baseAutoscale,
    });

    const transfersSuccess = chart.addAreaSeries({
      lineColor: '#2563eb',
      topColor: 'rgba(37,99,235,0.22)',
      bottomColor: 'rgba(59,130,246,0.02)',
      lineWidth: 3,
      lineStyle: LineStyle.Dotted,
      title: 'Sell (Success)',
      autoscaleInfoProvider: baseAutoscale,
    });
    const transfersFailed = chart.addLineSeries({
      color: '#f97316',
      lineWidth: 3,
      lineStyle: LineStyle.Dashed,
      title: 'Sell (Failed)',
      autoscaleInfoProvider: baseAutoscale,
    });

    // Loading "live" series (subtle gray motion while fetching)
    const loadingSeries = chart.addLineSeries({
      color: isDark ? 'rgba(148,163,184,0.85)' : 'rgba(100,116,139,0.85)',
      lineWidth: 2,
      lineStyle: LineStyle.Dotted,
      title: 'Loading',
      autoscaleInfoProvider: baseAutoscale,
    });

    // Fallback (no type): keep legacy 2 series
    const legacySuccess = chart.addAreaSeries({
      lineColor: '#22c55e',
      topColor: 'rgba(34,197,94,0.25)',
      bottomColor: 'rgba(34,197,94,0.02)',
      lineWidth: 2,
      title: 'Success',
      autoscaleInfoProvider: baseAutoscale,
    });
    const legacyFailed = chart.addAreaSeries({
      lineColor: '#ef4444',
      topColor: 'rgba(239,68,68,0.20)',
      bottomColor: 'rgba(239,68,68,0.02)',
      lineWidth: 2,
      title: 'Failed',
      autoscaleInfoProvider: baseAutoscale,
    });

    chartRef.current = chart;
    seriesRef.current = {
      paymentsSuccess,
      paymentsFailed,
      transfersSuccess,
      transfersFailed,
      loadingSeries,
      legacySuccess,
      legacyFailed,
    };

    // Custom tooltip (TradingView-like)
    const tooltipEl = tooltipRef.current;
    const formatMoney = (n) => {
      try {
        return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } catch {
        return String(n);
      }
    };
    const formatTime = (sec) => {
      const d = new Date(sec * 1000);
      return d.toLocaleString('th-TH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    };

    chart.subscribeCrosshairMove((param) => {
      if (!tooltipEl) return;
      if (!param || !param.time || !param.point) {
        tooltipEl.style.opacity = '0';
        return;
      }

      const sec = typeof param.time === 'number' ? param.time : null;
      if (!sec) {
        tooltipEl.style.opacity = '0';
        return;
      }

      // tooltip position
      const tooltipWidth = isFullscreen ? 600 : 400; // Wider in fullscreen mode
      tooltipEl.style.width = `${tooltipWidth}px`; // Update tooltip width dynamically
      const x = Math.max(8, Math.min(param.point.x + 12, (containerRef.current?.clientWidth || 0) - tooltipWidth - 20));
      const y = Math.max(8, Math.min(param.point.y - 10, height - 160));
      tooltipEl.style.transform = `translate(${x}px, ${y}px)`;
      tooltipEl.style.opacity = '1';

      const bucket = txByMinute.get(sec) || [];
      const top = bucket.slice(0, 5);

      // compute bucket totals (by type)
      let pS = 0;
      let pF = 0;
      let tS = 0;
      let tF = 0;
      let s = 0;
      let f = 0;
      for (const r of bucket) {
        const status = getStatus(r);
        const amt = parseAmount(r?.amount ?? r?.amountInBaht ?? 0);
        if (amt <= 0) continue;
        const ok = isSuccess(status);
        const fail = !ok && !isPending(status);
        const type = r?.flowType === 'fund-transfers' ? 'transfers' : (r?.flowType === 'payments' ? 'payments' : null);
        if (type === 'payments') {
          if (ok) pS += amt;
          else if (fail) pF += amt;
        } else if (type === 'transfers') {
          if (ok) tS += amt;
          else if (fail) tF += amt;
        } else {
          if (ok) s += amt;
          else if (fail) f += amt;
        }
      }

      const rowsHtml = top
        .map((r) => {
          const ref = r?.ref || r?.ref1 || r?.internalRef || r?.rsTransID || r?.transactionId || r?.id || '-';
          const who = r?.member?.name || '';
          const amt = parseAmount(r?.amount ?? r?.amountInBaht ?? 0);
          const typeLabel = r?.flowType === 'fund-transfers' ? 'Sell' : (r?.flowType === 'payments' ? 'Buy' : '');
          const typeColor = r?.flowType === 'fund-transfers'
            ? '#2563eb'
            : (r?.flowType === 'payments'
              ? '#16a34a'
              : (isDark ? '#94a3b8' : '#64748b'));
          return `<div style="display:flex;justify-content:space-between;gap:10px;">
            <div style="min-width:0;flex:1;">
              ${typeLabel ? `<span style="display:inline-block;min-width:34px;text-align:center;font-size:10px;padding:2px 6px;border-radius:999px;background:${isDark ? 'rgba(15,23,42,0.35)' : 'rgba(226,232,240,0.8)'};color:${typeColor};font-weight:800;margin-right:6px;">${typeLabel}</span>` : ''}
              <span style="color:${isDark ? '#e2e8f0' : '#0f172a'};font-weight:600;">${ref}</span>
              ${isFullscreen && who ? `<span style="color:${isDark ? '#94a3b8' : '#64748b'};margin-left:6px;">${who}</span>` : ''}
            </div>
            <div style="color:${isDark ? '#cbd5e1' : '#334155'};font-variant-numeric:tabular-nums;flex-shrink:0;margin-left:8px;">${formatMoney(amt)}</div>
          </div>`;
        })
        .join('');

      const hasType = rows.some((r) => r?.flowType === 'payments' || r?.flowType === 'fund-transfers');
      const totalsHtml = hasType
        ? `<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:8px;font-size:12px;">
            <div style="color:#16a34a;font-weight:900;">Buy (Success): ${formatMoney(pS)}</div>
            <div style="color:#ef4444;font-weight:900;">Buy (Failed): ${formatMoney(pF)}</div>
            <div style="color:#2563eb;font-weight:900;">Sell (Success): ${formatMoney(tS)}</div>
            <div style="color:#f97316;font-weight:900;">Sell (Failed): ${formatMoney(tF)}</div>
          </div>`
        : `<div style="display:flex;gap:10px;margin-bottom:8px;font-size:12px;">
            <div style="color:#22c55e;font-weight:700;">Success: ${formatMoney(s)}</div>
            <div style="color:#ef4444;font-weight:700;">Failed: ${formatMoney(f)}</div>
          </div>`;

      tooltipEl.innerHTML = `
        <div style="font-size:11px;color:${isDark ? '#94a3b8' : '#64748b'};margin-bottom:6px;">${formatTime(sec)}</div>
        ${totalsHtml}
        <div style="display:flex;flex-direction:column;gap:6px;">${rowsHtml || `<div style="color:${isDark ? '#94a3b8' : '#64748b'};">No refs</div>`}</div>
      `;
    });

    // Resize observer
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const nextWidth = Math.floor(entry.contentRect.width);
      const nextHeight = Math.floor(entry.contentRect.height);
      chart.applyOptions({ width: nextWidth, height: nextHeight });
    });
    // Observe wrapper (more reliable sizing), fallback to container
    ro.observe(wrapperRef.current || containerRef.current);

    return () => {
      ro.disconnect();
      // subscription is removed when chart is removed
      chart.remove();
      chartRef.current = null;
      seriesRef.current = {};
    };
  }, [height, txByMinute, getStatus, isSuccess, isPending, isFullscreen]);

  // Update theme without recreating chart
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const isDark = theme === 'dark';
    chart.applyOptions({
      layout: {
        textColor: isDark ? '#cbd5e1' : '#475569',
      },
      grid: {
        vertLines: { color: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.18)' },
        horzLines: { color: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.18)' },
      },
      crosshair: {
        vertLine: { color: isDark ? 'rgba(148,163,184,0.35)' : 'rgba(100,116,139,0.35)' },
        horzLine: { color: isDark ? 'rgba(148,163,184,0.35)' : 'rgba(100,116,139,0.35)' },
      },
    });
  }, [theme]);

  // "Live" loading animation: update a subtle moving series so the chart itself feels alive.
  useEffect(() => {
    const chart = chartRef.current;
    const s = seriesRef.current;
    const loadingSeries = s?.loadingSeries;
    if (!chart || !loadingSeries) return;

    const stop = () => {
      const cur = loadingAnimRef.current;
      if (cur.rafId) window.cancelAnimationFrame(cur.rafId);
      loadingAnimRef.current = { rafId: null, startSec: null, phase: 0, points: [], lastUpdateMs: 0 };
      loadingSeries.setData([]);
    };

    if (!isLoading) {
      stop();
      return;
    }

    // start animation (smooth, rAF-driven; throttle chart updates to reduce jitter)
    const cur = loadingAnimRef.current;
    if (!cur.startSec) cur.startSec = Math.floor(Date.now() / 1000) - 60;

    // lock a small visible range once (avoid fighting the user while they pan/zoom)
    try {
      const now = Math.floor(Date.now() / 1000);
      chart.timeScale().setVisibleRange({ from: now - 60, to: now + 2 });
    } catch {
      // ignore
    }

    const step = (tsMs) => {
      const nowSec = Math.floor(Date.now() / 1000);
      const start = nowSec - 60;

      // advance phase smoothly
      cur.phase += 0.06;

      // throttle series.setData to ~15fps for smoothness without jitter
      if (!cur.lastUpdateMs || tsMs - cur.lastUpdateMs >= 66) {
        cur.lastUpdateMs = tsMs;

        const { baseline, amp } = loadingBaselineRef.current || { baseline: 1, amp: 1 };
        const v = Math.max(0, baseline + Math.sin(cur.phase) * amp);

        cur.points.push({ time: nowSec, value: v });
        cur.points = cur.points.filter((p) => p.time >= start);

        // backfill so the line doesn't look like a single dot on first frames
        if (cur.points.length < 25) {
          const pts = [];
          for (let i = 0; i < 30; i++) {
            const t = start + i * 2;
            const vv = Math.max(0, baseline + Math.sin(cur.phase - (30 - i) * 0.12) * amp);
            pts.push({ time: t, value: vv });
          }
          cur.points = pts;
        }

        loadingSeries.setData(cur.points);
      }

      cur.rafId = window.requestAnimationFrame(step);
    };

    cur.rafId = window.requestAnimationFrame(step);

    return () => stop();
  }, [isLoading]);

  useEffect(() => {
    const s = seriesRef.current;
    if (!s) return;

    const hasType = !!data?.hasType;
    // hide/show by setting empty data to the unused series
    if (hasType) {
      s.paymentsSuccess?.setData?.(data.paymentsSuccess || []);
      s.paymentsFailed?.setData?.(data.paymentsFailed || []);
      s.transfersSuccess?.setData?.(data.transfersSuccess || []);
      s.transfersFailed?.setData?.(data.transfersFailed || []);
      // keep loading series separate
      s.legacySuccess?.setData?.([]);
      s.legacyFailed?.setData?.([]);
    } else {
      s.legacySuccess?.setData?.(data.success || []);
      s.legacyFailed?.setData?.(data.failed || []);
      s.paymentsSuccess?.setData?.([]);
      s.paymentsFailed?.setData?.([]);
      s.transfersSuccess?.setData?.([]);
      s.transfersFailed?.setData?.([]);
    }
    chartRef.current?.timeScale()?.fitContent?.();

    // Update loading baseline from real data (so the loading wave feels "attached" to the market level)
    const last =
      (data?.paymentsSuccess?.[data.paymentsSuccess.length - 1]?.value) ??
      (data?.transfersSuccess?.[data.transfersSuccess.length - 1]?.value) ??
      (data?.success?.[data.success.length - 1]?.value) ??
      1;
    const baseline = Math.max(1, Number(last) || 1);
    loadingBaselineRef.current = {
      baseline,
      amp: Math.max(1, baseline * 0.03), // 3% wave
    };
  }, [data]);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Simple legend (high contrast) */}
      <div
        style={{
          position: 'absolute',
          left: 10,
          top: 8,
          zIndex: 2,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          fontSize: 11,
          color: theme === 'dark' ? '#cbd5e1' : '#334155',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 18, height: 0, borderTop: '3px solid #16a34a' }} /> Buy (Success)
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 18, height: 0, borderTop: '3px dashed #ef4444' }} /> Buy (Failed) 
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 18, height: 0, borderTop: '3px dotted #2563eb' }} /> Sell (Success)
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 18, height: 0, borderTop: '3px dashed #f97316' }} /> Sell (Failed)
        </span>
      </div>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <div
        ref={tooltipRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: isFullscreen ? 600 : 400,
          pointerEvents: 'none',
          opacity: 0,
          transform: 'translate(10px, 10px)',
          background: theme === 'dark' ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.92)',
          border: theme === 'dark' ? '1px solid rgba(51,65,85,0.7)' : '1px solid rgba(226,232,240,0.9)',
          borderRadius: 12,
          padding: 10,
          boxShadow: theme === 'dark'
            ? '0 10px 30px rgba(0,0,0,0.35)'
            : '0 10px 30px rgba(2,6,23,0.12)',
          backdropFilter: 'blur(8px)',
        }}
      />
    </div>
  );
});

export default TransactionFlowTVChart;

