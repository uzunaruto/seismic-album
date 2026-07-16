'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MAG_ROLES, magFromRoles, magColor, TIER_NAMES, GUILD_ID, DISCORD_CLIENT_ID } from '@/lib/mag';
import { getCuratedMembers, Member } from '@/lib/curated';

const TIERS = [9, 8, 7, 6, 5, 4, 3, 2, 1]; // display high -> low

function avatarUrl(m: Member): string {
  if (m.avatarUrl) return m.avatarUrl;
  // discord default avatar by discriminator mod
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

  // ---- OAuth login ----
  const discordLogin = useCallback(() => {
    const redirect = window.location.origin + '/';
    window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=token&scope=${encodeURIComponent('identify guilds.members.read')}&redirect_uri=${encodeURIComponent(redirect)}&state=seismic`;
  }, []);

  // ---- parse token from hash ----
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

  // ---- fetch live members ----
  const fetchMembers = useCallback(async (tk: string) => {
    setLoading(true);
    setError(null);
    try {
      // 1) self profile
      const meResp = await fetch('/api/discord/users/@me', { headers: { Authorization: `Bearer ${tk}` } });
      const me = await meResp.json();
      if (!meResp.ok) throw new Error(me.message || 'OAuth failed');

      // 2) self member in guild (to resolve own mag)
      const memResp = await fetch(`/api/discord/users/@me/guilds/${GUILD_ID}/member`, { headers: { Authorization: `Bearer ${tk}` } });
      const mem = await memResp.json();
      const myMag = memResp.ok ? magFromRoles(mem.roles || []) : 0;
      setProfile({
        name: me.username,
        avatarUrl: me.avatar ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png` : '',
        mag: myMag,
      });

      // 3) try list all members — needs Server Members Intent
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
      // fallback to curated
      const curated: Record<number, Member[]> = {};
      for (const t of TIERS) curated[t] = getCuratedMembers(t);
      setMembersByTier(curated);
      setLive(false);
      setError(e.message || 'Live fetch failed — showing curated sample');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token && membersByTier && Object.keys(membersByTier).length === 0) {
      fetchMembers(token);
    }
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

  return (
    <main className="min-h-[100dvh] px-4 py-8 max-w-6xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            SEISMIC <span style={{ color: '#A87504' }}>MAGNITUDE</span> ALBUM
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            {live ? `Live from Discord guild · ${totalMembers} members` : 'Curated showcase · login Discord for live members'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!token ? (
            <button onClick={discordLogin} className="px-4 py-2 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] text-white font-semibold text-sm transition">
              Login Discord
            </button>
          ) : (
            <div className="flex items-center gap-3">
              {profile && (
                <div className="flex items-center gap-2 text-sm">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} width={28} height={28} className="rounded-full" alt="" />
                  ) : null}
                  <span>{profile.name}</span>
                  {profile.mag > 0 && (
                    <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: magColor(profile.mag), color: '#0a0a0a' }}>
                      M{profile.mag}
                    </span>
                  )}
                </div>
              )}
              <button onClick={logout} className="px-3 py-1.5 rounded-lg border border-neutral-700 text-xs hover:bg-neutral-800 transition">
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {loading && <p className="text-neutral-400 text-sm mb-4">Loading members…</p>}
      {error && !loading && (
        <p className="text-amber-500 text-xs mb-4">⚠ {error}</p>
      )}

      {/* Tier grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TIERS.map((t) => {
          const color = magColor(t);
          const count = tierMembers(t).length;
          return (
            <button
              key={t}
              onClick={() => setOpenTier(t)}
              className="tier-card text-left rounded-2xl p-5 border border-neutral-800 bg-neutral-900/60 hover:border-neutral-600"
              style={{ boxShadow: `inset 0 0 0 1px ${color}22` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-lg" style={{ background: color, color: '#0a0a0a' }}>
                    M{t}
                  </div>
                  <div>
                    <div className="font-bold text-lg leading-tight">{TIER_NAMES[t]}</div>
                    <div className="text-xs text-neutral-500">Magnitude {t}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold" style={{ color }}>{count}</div>
                  <div className="text-[10px] text-neutral-500 uppercase tracking-wider">members</div>
                </div>
              </div>
              <div className="mt-4 h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, count * 4)}%`, background: color }} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Modal */}
      {openTier !== null && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setOpenTier(null)}>
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl max-w-3xl w-full max-h-[85dvh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-neutral-800" style={{ borderColor: `${magColor(openTier)}44` }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center font-extrabold" style={{ background: magColor(openTier), color: '#0a0a0a' }}>
                  M{openTier}
                </div>
                <div>
                  <div className="font-bold text-lg">{TIER_NAMES[openTier]}</div>
                  <div className="text-xs text-neutral-500">{tierMembers(openTier).length} members</div>
                </div>
              </div>
              <button onClick={() => setOpenTier(null)} className="text-neutral-400 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="p-5 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {tierMembers(openTier).map((m) => (
                <div key={m.id} className="member-tile flex flex-col items-center text-center p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                  <img src={avatarUrl(m)} width={56} height={56} className="rounded-full mb-2 bg-neutral-800" alt={m.name} />
                  <div className="text-xs font-semibold truncate w-full" title={m.name}>{m.name}</div>
                  <div className="text-[10px] text-neutral-500">M{m.mag}</div>
                </div>
              ))}
              {tierMembers(openTier).length === 0 && (
                <div className="col-span-full text-center text-neutral-500 text-sm py-8">No members in this tier yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="mt-10 text-center text-xs text-neutral-600">
        Seismic Magnitude Album · {live ? 'live' : 'showcase'} mode
      </footer>
    </main>
  );
}
