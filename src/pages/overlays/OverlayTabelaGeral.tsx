import { useSearchParams } from "react-router-dom";
import { TabelaGeralTable } from "./overlayTabelaGeral/TabelaGeralTable";
import { useOverlayRankingRows } from "./overlayTabelaGeral/useOverlayRankingRows";

function isHexColor(s: string) {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(String(s || ""));
}

export default function OverlayTabelaGeral() {
  const [qs] = useSearchParams();
  const fontColorRaw = qs.get("font_color") || "";
  // No OBS normalmente o fundo é escuro: branco por padrão
  const fontColor = isHexColor(fontColorRaw) ? fontColorRaw : "#ffffff";

  const firstColorRaw = qs.get("first_color") || "";
  const firstColor = isHexColor(firstColorRaw) ? firstColorRaw : "";

  const { limit, cols, gap, font, showLogo, showHeader, shouldMatches, shouldWins, leftRows, rightRows, status } =
    useOverlayRankingRows();

  // Altura adaptativa para caber até 24 linhas.
  // Aproximação: 32px por linha + cabeçalho (32px) + respiro.
  const overlayHeight = Math.max(300, (showHeader ? 32 : 0) + limit * 32 + 12);

  // Overlay canvas (1920x300) + fundo transparente
  return (
    <div
      style={{ width: 1920, height: overlayHeight, background: "transparent", color: fontColor }}
      className="overflow-hidden px-[78px]"
    >
      <div
        className="w-full h-full grid items-start"
        style={{ gridTemplateColumns: cols === 2 ? "1fr 1fr" : "1fr", gap }}
      >
        <div className="w-full">
          <TabelaGeralTable
            data={leftRows}
            aria="Tabela geral (coluna 1)"
            font={font}
            showLogo={showLogo}
            showHeader={showHeader}
            showMatches={shouldMatches}
            showWins={shouldWins}
            firstColor={firstColor}
          />
        </div>
        {cols === 2 ? (
          <div className="w-full">
            <TabelaGeralTable
              data={rightRows}
              aria="Tabela geral (coluna 2)"
              font={font}
              showLogo={showLogo}
              showHeader={showHeader}
              showMatches={shouldMatches}
              showWins={shouldWins}
              firstColor={firstColor}
            />
          </div>
        ) : null}
      </div>

      {status ? (
        <div className="mt-2 text-[11px] opacity-70" aria-live="polite">
          {status}
        </div>
      ) : null}
    </div>
  );
}

