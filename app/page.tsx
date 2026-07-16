'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MAG_ROLES, magFromRoles, magColor, TIER_NAMES, GUILD_ID, DISCORD_CLIENT_ID } from '@/lib/mag';
import { getCuratedMembers, Member } from '@/lib/curated';

const TIERS = [9, 8, 7, 6, 5, 4, 3, 2, 1];

function avatarUrl(m: Member): string {
  if (m.avatarUrl) return m.avatarUrl;
  const idx = Number(m.id) % 5;
  return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}

export default function Page() {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ name: string; avatarUrl: string; mag: number } | null>(null);
  const [membersByTier, setMembersByTier] = useState<Record<number, Member[]>>({});
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openTier, setOpenTier] = useState<number | null>(null);
  const didInit = useRef(false);

  const discordLogin = useCallback(() => {
    const redirect = window.location.origin + '/';
    window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=token&scope=${encodeURIComponent('identify guilds.members.read')}&redirect_uri=${encodeURIComponent(redirect)}&state=seismic`;
  }, []);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const hash = window.location.hash;
    if (hash.includes('access_token')) {
      const params = new URLSearchParams(hash.slice(1));
      const t = params.get('access_token');
      if (t) {
        localStorage.setItem('seismicAlbumToken', t);
        window.history.replaceState(null, '', window.location.pathname);
        setToken(t);
      }
    } else {
      const saved = localStorage.getItem('seismicAlbumToken');
      if (saved) setToken(saved);
    }
  }, []);

  const fetchMembers = useCallback(async (tk: string) => {
    setLoading(true);
    setError(null);
    try {
      const meResp = await fetch('/api/discord/users/@me', { headers: { Authorization: `Bearer ${tk}` } });
      const me = await meResp.json();
      if (!meResp.ok) throw new Error(me.message || 'OAuth failed');

      const memResp = await fetch(`/api/discord/users/@me/guilds/${GUILD_ID}/member`, { headers: { Authorization: `Bearer ${tk}` } });
      const mem = await memResp.json();
      const myMag = memResp.ok ? magFromRoles(mem.roles || []) : 0;
      setProfile({
        name: me.username,
        avatarUrl: me.avatar ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png` : '',
        mag: myMag,
      });

      const gathered: Record<number, Member[]> = {};
      for (const t of TIERS) gathered[t] = [];
      let after = '0';
      let page = 0;
      let reachedEnd = false;
      while (!reachedEnd && page < 40) {
        const resp = await fetch(`/api/discord/guilds/${GUILD_ID}/members?limit=1000&after=${after}`, { headers: { Authorization: `Bearer ${tk}` } });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err.message || `Guild members fetch failed (${resp.status})`);
        }
        const list = await resp.json();
        if (!Array.isArray(list) || list.length === 0) { reachedEnd = true; break; }
        for (const m of list) {
          const mag = magFromRoles(m.roles || []);
          if (mag >= 1 && gathered[mag]) {
            gathered[mag].push({
              id: m.user.id,
              name: m.user.username,
              avatarUrl: m.user.avatar ? `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png` : '',
              mag,
            });
          }
        }
        after = list[list.length - 1].user.id;
        page++;
      }
      setMembersByTier(gathered);
      setLive(true);
    } catch (e: any) {
      const curated: Record<number, Member[]> = {};
      for (const t of TIERS) curated[t] = getCuratedMembers(t);
      setMembersByTier(curated);
      setLive(false);
      setError(e.message || 'Live fetch failed, showing sample');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token && Object.keys(membersByTier).length === 0) fetchMembers(token);
  }, [token, membersByTier, fetchMembers]);

  const logout = () => {
    localStorage.removeItem('seismicAlbumToken');
    setToken(null);
    setProfile(null);
    setMembersByTier({});
    setLive(false);
  };

  const tierMembers = (t: number): Member[] => membersByTier[t] || getCuratedMembers(t);
  const totalMembers = Object.values(membersByTier).reduce((a, b) => a + b.length, 0);
  const highest = TIERS.find((t) => tierMembers(t).length > 0) ?? 9;

  return (
    <>
      <div className="bg-mesh" />
      <main className="relative z-10 min-h-[100dvh] px-4 sm:px-6 py-10 max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-neutral-500 mb-2">Seismic Community</div>
            <h1 className="font-display text-4xl sm:text-5xl leading-none">
              MAGNITUDE <span style={{ color: magColor(highest) }}>ALBUM</span>
            </h1>
            <p className="text-sm text-neutral-400 mt-3 max-w-md">
              {live
                ? `${totalMembers} members ranked across 9 tiers. Click a tier to view the roster.`
                : 'Showcase of all Magnitude tiers. Login with Discord to load the live roster.'}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {!token ? (
              <button
                onClick={discordLogin}
                className="px-5 py-2.5 rounded-xl font-semibold text-sm transition active:scale-95"
                style={{ background: '#5865F2', color: '#fff' }}
              >
                Login Discord
              </button>
            ) : (
              <div className="flex items-center gap-3">
                {profile && (
                  <div className="flex items-center gap-2 text-sm bg-neutral-900/60 border border-neutral-800 rounded-xl px-3 py-1.5">
                    {profile.avatarUrl && <img src={profile.avatarUrl} width={26} height={26} className="rounded-full" alt="" />}
                    <span className="font-medium">{profile.name}</span>
                    {profile.mag > 0 && (
                      <span className="px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: magColor(profile.mag), color: '#0a0a0f' }}>
                        M{profile.mag}
                      </span>
                    )}
                  </div>
                )}
                <button onClick={logout} className="px-3 py-2 rounded-xl border border-neutral-700 text-xs hover:bg-neutral-800 transition">
                  Exit
                </button>
              </div>
            )}
          </div>
        </header>

        {loading && <p className="text-neutral-400 text-sm mb-4">Loading roster…</p>}
        {error && !loading && <p className="text-amber-500/80 text-xs mb-4">Note: {error}</p>}

        {/* Bento tier grid — varied column spans */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {TIERS.map((t, i) => {
            const color = magColor(t);
            const glow = color + '55';
            const count = tierMembers(t).length;
            // bento: tier 9 & 8 span 2 cols on large
            const span = (t === 9 || t === 8) ? 'lg:col-span-2' : '';
            return (
              <button
                key={t}
                onClick={() => setOpenTier(t)}
                className={`tier-card p-4 sm:p-5 text-left ${span} stagger`}
                style={{
                  ['--tier-color' as any]: color,
                  ['--tier-glow' as any]: glow,
                  animationDelay: `${i * 45}ms`,
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="tier-badge w-11 h-11 rounded-xl flex items-center justify-center text-lg">M{t}</div>
                  <span className="text-3xl font-display leading-none" style={{ color }}>{count}</span>
                </div>
                <div className="font-bold text-base leading-tight">{TIER_NAMES[t]}</div>
                <div className="text-[11px] uppercase tracking-wider text-neutral-500 mt-0.5">Magnitude {t}</div>
                <div className="mt-3 h-1 rounded-full bg-neutral-800 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, count * 5)}%`, background: color }} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Modal */}
        {openTier !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" onClick={() => setOpenTier(null)}>
            <div
              className="modal-panel bg-[#0d0d16] border border-neutral-800 rounded-2xl max-w-3xl w-full max-h-[85dvh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
              style={{ boxShadow: `0 0 60px -20px ${magColor(openTier)}88` }}
            >
              <div className="flex items-center justify-between p-5 border-b border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="tier-badge w-10 h-10 rounded-lg flex items-center justify-center font-display" style={{ background: magColor(openTier), color: '#0a0a0f' }}>
                    M{openTier}
                  </div>
                  <div>
                    <div className="font-bold text-lg">{TIER_NAMES[openTier]}</div>
                    <div className="text-xs text-neutral-500">{tierMembers(openTier).length} members</div>
                  </div>
                </div>
                <button onClick={() => setOpenTier(null)} className="text-neutral-500 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-800 transition">×</button>
              </div>
              <div className="p-5 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {tierMembers(openTier).map((m) => (
                  <div key={m.id} className="member-tile flex flex-col items-center text-center p-3" style={{ ['--tier-color' as any]: magColor(m.mag) }}>
                    <img src={avatarUrl(m)} width={52} height={52} className="rounded-xl mb-2 bg-neutral-800 object-cover" alt={m.name} />
                    <div className="text-xs font-semibold truncate w-full" title={m.name}>{m.name}</div>
                  </div>
                ))}
                {tierMembers(openTier).length === 0 && (
                  <div className="col-span-full text-center text-neutral-500 text-sm py-10">No members in this tier yet.</div>
                )}
              </div>
            </div>
          </div>
        )}

        <footer className="mt-12 text-center text-xs text-neutral-600">
          Seismic Magnitude Album {live ? '· live roster' : '· sample view'}
        </footer>
      </main>
    </>
  );
}
