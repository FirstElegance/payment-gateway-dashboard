import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { createChart, CrosshairMode, LineStyle } from 'lightweight-charts';

// Bucket points by minute
const bucketToMinute = (date) => {
  const d = new Date(date);
  d.setSeconds(0, 0);
  return Math.floor(d.getTime() / 1000);
};

const parseAmount = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n;
};

/**
 * TradingView-style Wallet Transaction Flow chart
 * Shows Deposits and Withdrawals with pan/zoom
 */
const WalletFlowTVChart = forwardRef(function WalletFlowTVChart({
  deposits = [],
  withdrawals = [],
  isLoading = false,
  height = 260,
  theme = 'light',
  isFullscreen = false,
}, ref) {
  const wrapperRef = useRef(null);
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef({ depositsSuccess: null, depositsFailed: null, withdrawalsSuccess: null, withdrawalsFailed: null });
  const tooltipRef = useRef(null);

  const data = useMemo(() => {
    const buckets = new Map();

    // Process deposits
    for (const d of deposits) {
      if (!d?.createdAt) continue;
      const t = bucketToMinute(d.createdAt);
      const amount = parseAmount(d.amount || 0);
      if (amount <= 0) continue;

      const cur = buckets.get(t) || { depositsSuccess: 0, depositsFailed: 0, withdrawalsSuccess: 0, withdrawalsFailed: 0 };
      if (d.status === 'SUCCESS') cur.depositsSuccess += amount;
      else if (d.status === 'FAILED') cur.depositsFailed += amount;
      buckets.set(t, cur);
    }

    // Process withdrawals
    for (const w of withdrawals) {
      if (!w?.createdAt) continue;
      const t = bucketToMinute(w.createdAt);
      const amount = parseAmount(w.amount || 0);
      if (amount <= 0) continue;

      const cur = buckets.get(t) || { depositsSuccess: 0, depositsFailed: 0, withdrawalsSuccess: 0, withdrawalsFailed: 0 };
      if (w.status === 'SUCCESS') cur.withdrawalsSuccess += amount;
      else if (w.status === 'FAILED') cur.withdrawalsFailed += amount;
      buckets.set(t, cur);
    }

    const times = Array.from(buckets.keys()).sort((a, b) => a - b);
    const mk = (getter) => times.map((time) => ({ time, value: getter(buckets.get(time)) })).filter((p) => p.value > 0);

    return {
      depositsSuccess: mk((b) => b.depositsSuccess),
      depositsFailed: mk((b) => b.depositsFailed),
      withdrawalsSuccess: mk((b) => b.withdrawalsSuccess),
      withdrawalsFailed: mk((b) => b.withdrawalsFailed),
    };
  }, [deposits, withdrawals]);

  const txByMinute = useMemo(() => {
    const map = new Map();
    const allTx = [
      ...deposits.map(d => ({ ...d, type: 'deposit' })),
      ...withdrawals.map(w => ({ ...w, type: 'withdrawal' }))
    ];
    for (const tx of allTx) {
      if (!tx?.createdAt) continue;
      const t = bucketToMinute(tx.createdAt);
      const list = map.get(t) || [];
      list.push(tx);
      map.set(t, list);
    }
    for (const [t, list] of map.entries()) {
      list.sort((a, b) => parseAmount(b?.amount || 0) - parseAmount(a?.amount || 0));
      map.set(t, list);
    }
    return map;
  }, [deposits, withdrawals]);

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
      chart.timeScale().resetTimeScale();
      chart.timeScale().fitContent();
    },
  }), []);

  useEffect(() => {
    if (!containerRef.current) return;

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
        attributionLogo: false,
      },
      localization: {
        locale: 'th-TH',
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
      watermark: { visible: false },
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
        scaleMargins: { top: 0.2, bottom: 0 },
      },
      timeScale: {
        borderVisible: false,
        leftOffset: 20,
        rightOffset: 20,
        fixLeftEdge: false,
        fixRightEdge: false,
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 8,
        minBarSpacing: 0.5,
        tickMarkFormatter: (time) => {
          const d = new Date(time * 1000);
          const hours = d.getHours().toString().padStart(2, '0');
          const minutes = d.getMinutes().toString().padStart(2, '0');
          return `${hours}:${minutes}`;
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
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

    // Deposits: Green area (Success) + Red dashed line (Failed)
    const depositsSuccess = chart.addAreaSeries({
      lineColor: '#22c55e',
      topColor: 'rgba(34,197,94,0.28)',
      bottomColor: 'rgba(34,197,94,0.02)',
      lineWidth: 3,
      lineStyle: LineStyle.Solid,
      title: 'Deposits (Success)',
      autoscaleInfoProvider: baseAutoscale,
    });
    const depositsFailed = chart.addLineSeries({
      color: '#ef4444',
      lineWidth: 3,
      lineStyle: LineStyle.Dashed,
      title: 'Deposits (Failed)',
      autoscaleInfoProvider: baseAutoscale,
    });

    // Withdrawals: Orange area (Success) + Red dashed line (Failed)
    const withdrawalsSuccess = chart.addAreaSeries({
      lineColor: '#f97316',
      topColor: 'rgba(249,115,22,0.22)',
      bottomColor: 'rgba(249,115,22,0.02)',
      lineWidth: 3,
      lineStyle: LineStyle.Solid,
      title: 'Withdrawals (Success)',
      autoscaleInfoProvider: baseAutoscale,
    });
    const withdrawalsFailed = chart.addLineSeries({
      color: '#dc2626',
      lineWidth: 3,
      lineStyle: LineStyle.Dashed,
      title: 'Withdrawals (Failed)',
      autoscaleInfoProvider: baseAutoscale,
    });

    chartRef.current = chart;
    seriesRef.current = { depositsSuccess, depositsFailed, withdrawalsSuccess, withdrawalsFailed };

    // Custom tooltip
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

      const tooltipWidth = isFullscreen ? 600 : 400;
      tooltipEl.style.width = `${tooltipWidth}px`;
      const x = Math.max(8, Math.min(param.point.x + 12, (containerRef.current?.clientWidth || 0) - tooltipWidth - 20));
      const y = Math.max(8, Math.min(param.point.y - 10, height - 160));
      tooltipEl.style.transform = `translate(${x}px, ${y}px)`;
      tooltipEl.style.opacity = '1';

      const bucket = txByMinute.get(sec) || [];
      const top = bucket.slice(0, 5);

      let dS = 0, dF = 0, wS = 0, wF = 0;
      for (const tx of bucket) {
        const amt = parseAmount(tx?.amount || 0);
        if (amt <= 0) continue;
        if (tx.type === 'deposit') {
          if (tx.status === 'SUCCESS') dS += amt;
          else if (tx.status === 'FAILED') dF += amt;
        } else if (tx.type === 'withdrawal') {
          if (tx.status === 'SUCCESS') wS += amt;
          else if (tx.status === 'FAILED') wF += amt;
        }
      }

      const rowsHtml = top
        .map((tx) => {
          const ref = tx?.ref || tx?.id || '-';
          const memberName = tx?.memberName || '';
          const amt = parseAmount(tx?.amount || 0);
          const typeLabel = tx.type === 'deposit' ? 'Deposit' : 'Withdraw';
          const typeColor = tx.type === 'deposit' ? '#22c55e' : '#f97316';
          return `<div style="display:flex;justify-content:space-between;gap:10px;">
            <div style="min-width:0;flex:1;">
              <span style="display:inline-block;min-width:60px;text-align:center;font-size:10px;padding:2px 6px;border-radius:999px;background:${isDark ? 'rgba(15,23,42,0.35)' : 'rgba(226,232,240,0.8)'};color:${typeColor};font-weight:800;margin-right:6px;">${typeLabel}</span>
              <span style="color:${isDark ? '#e2e8f0' : '#0f172a'};font-weight:600;">${ref}</span>
              ${isFullscreen && memberName ? `<span style="color:${isDark ? '#94a3b8' : '#64748b'};margin-left:6px;">${memberName}</span>` : ''}
            </div>
            <div style="color:${isDark ? '#cbd5e1' : '#334155'};font-variant-numeric:tabular-nums;flex-shrink:0;margin-left:8px;">฿${formatMoney(amt)}</div>
          </div>`;
        })
        .join('');

      const totalsHtml = `<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:8px;font-size:12px;">
        <div style="color:#22c55e;font-weight:900;">Deposits (Success): ฿${formatMoney(dS)}</div>
        <div style="color:#ef4444;font-weight:900;">Deposits (Failed): ฿${formatMoney(dF)}</div>
        <div style="color:#f97316;font-weight:900;">Withdrawals (Success): ฿${formatMoney(wS)}</div>
        <div style="color:#dc2626;font-weight:900;">Withdrawals (Failed): ฿${formatMoney(wF)}</div>
      </div>`;

      tooltipEl.innerHTML = `
        <div style="font-size:11px;color:${isDark ? '#94a3b8' : '#64748b'};margin-bottom:6px;">${formatTime(sec)}</div>
        ${totalsHtml}
        <div style="display:flex;flex-direction:column;gap:6px;">${rowsHtml || `<div style="color:${isDark ? '#94a3b8' : '#64748b'};">No transactions</div>`}</div>
      `;
    });

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const nextWidth = Math.floor(entry.contentRect.width);
      const nextHeight = Math.floor(entry.contentRect.height);
      chart.applyOptions({ width: nextWidth, height: nextHeight });
    });
    ro.observe(wrapperRef.current || containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = {};
    };
  }, [height, txByMinute, isFullscreen, theme]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const isDark = theme === 'dark';
    chart.applyOptions({
      layout: { textColor: isDark ? '#cbd5e1' : '#475569' },
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

  useEffect(() => {
    const s = seriesRef.current;
    if (!s) return;
    s.depositsSuccess?.setData?.(data.depositsSuccess || []);
    s.depositsFailed?.setData?.(data.depositsFailed || []);
    s.withdrawalsSuccess?.setData?.(data.withdrawalsSuccess || []);
    s.withdrawalsFailed?.setData?.(data.withdrawalsFailed || []);
    chartRef.current?.timeScale()?.fitContent?.();
  }, [data]);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
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
          <span style={{ width: 18, height: 0, borderTop: '3px solid #22c55e' }} /> Deposits (Success)
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 18, height: 0, borderTop: '3px dashed #ef4444' }} /> Deposits (Failed)
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 18, height: 0, borderTop: '3px solid #f97316' }} /> Withdrawals (Success)
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 18, height: 0, borderTop: '3px dashed #dc2626' }} /> Withdrawals (Failed)
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

export default WalletFlowTVChart;
