export const designTokens = {
  colors: {
    bgPrimary: '#0A1128',
    bgSecondary: '#121E38',
    glassSurface: 'rgba(28, 35, 41, 0.55)',
    glassBorder: 'rgba(255, 255, 255, 0.10)',
    goldPrincipal: '#D4A43A',
    goldBright: '#F4C95D',
    goldLight: '#FFE7A0',
    amber: '#B9821C',
    textPrimary: '#F5F7F8',
    textSecondary: '#A8B0B7',
    success: '#35D39A'
  },
  glass: {
    base: 'bg-[rgba(28,35,41,0.55)] backdrop-blur-[18px] border border-[rgba(255,255,255,0.10)] shadow-[0_20px_50px_rgba(0,0,0,0.35)]',
    input: 'bg-[rgba(28,35,41,0.35)] backdrop-blur-md border border-[rgba(255,255,255,0.15)] focus:border-[#D4A43A] focus:ring-1 focus:ring-[#D4A43A]',
    glow: 'shadow-[0_0_20px_rgba(212,164,58,0.25),0_0_60px_rgba(212,164,58,0.12)]'
  },
  gradients: {
    gold: 'bg-gradient-to-br from-[#B9821C] via-[#D4A43A] to-[#FFE7A0]',
    textGold: 'bg-gradient-to-br from-[#D4A43A] to-[#FFE7A0] bg-clip-text text-transparent'
  },
  depth3D: {
    container: 'perspective-[1200px]',
    // Framer motion variants will handle the actual tilt, but this is a CSS fallback if needed
    tiltHover: 'hover:rotate-x-2 hover:rotate-y-[-2deg] transition-all duration-500 ease-out'
  }
};
