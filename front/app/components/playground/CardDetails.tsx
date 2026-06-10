import clsx from "clsx";
import { Card } from "../../../types/card";
import { useTranslations } from "next-intl";
import { useLocale } from 'next-intl';

const container = clsx(
	"flex flex-col gap-2 p-3",
	"bg-black/20 backdrop-blur-sm rounded-sm",
	"border border-blue-300/20",
	"text-sm transition-all duration-200",
)

type Props = {
	card: Card | null;
};


export default function CardDetails({card} : Props)
{
	const p = useTranslations("Playground");
	const locale = useLocale();

	if (!card)
		return (
			<div className={clsx(container, "text-sky-200/30 italic text-xs")}>
				{p("hover_a_card")}
			</div>
		);

	return (
		<div className={container}>
			<div className="flex items-center justify-between">
				<span className="font-semibold text-blue-100">
					{card[`cardName_${locale}`]}
				</span>
				<span className="text-yellow-400 font-bold text-xs">
					{card.runeCost}R
				</span>
			</div>
				<span className="text-[9px] text-blue-200/40 uppercase tracking-wider">
					{card.type}
				</span>
				{card[`effectText_${locale}`] && (
					<p className="text-xs text-slate-300 leading-5 border-t border-blue-300/20 pt-2">
						{card[`effectText_${locale}`]}
					</p>
				)}
		</div>
	);
}
