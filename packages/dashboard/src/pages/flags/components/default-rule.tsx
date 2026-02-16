import { HelpCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Variation, Rollout } from '@/types/flag';
import type { FlagFormAction } from '@/hooks/use-flag-form';
import { PercentageRollout } from './percentage-rollout';
import { VARIATION_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface DefaultRuleProps {
  fallthrough: { variation?: number; rollout?: Rollout };
  variations: Variation[];
  offVariation: number;
  enabled: boolean;
  dispatch: React.Dispatch<FlagFormAction>;
}

export function DefaultRule({
  fallthrough,
  variations,
  offVariation,
  enabled,
  dispatch,
}: DefaultRuleProps) {
  const isRollout = fallthrough.rollout != null && fallthrough.rollout.variations.length > 0;

  const handleTypeToggle = () => {
    if (isRollout) {
      dispatch({
        type: 'SET_FALLTHROUGH_TYPE',
        payload: { serveType: 'variation', variationCount: variations.length },
      });
    } else {
      dispatch({
        type: 'SET_FALLTHROUGH_TYPE',
        payload: { serveType: 'rollout', variationCount: variations.length },
      });
    }
  };

  const offVariationData = variations[offVariation];

  return (
    <Card className="border-t-2 border-dashed border-t-muted-foreground/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Default Rule
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="size-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[260px]">
                The default rule applies to all contexts that don&apos;t match any of the
                targeting rules above. It&apos;s always evaluated last.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <CardDescription>
          When the flag is ON and no targeting rules match, serve:
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Off-variation section when targeting is OFF */}
        {!enabled && (
          <div className="flex items-center gap-3 rounded-lg border border-dashed bg-muted/50 p-3">
            <Badge variant="secondary" className="text-[11px]">
              OFF
            </Badge>
            <span className="text-sm text-muted-foreground">
              When targeting is off, all contexts receive:
            </span>
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <span
                className="inline-block size-2.5 rounded-full"
                style={{
                  backgroundColor: VARIATION_COLORS[offVariation % VARIATION_COLORS.length],
                }}
              />
              {offVariationData?.name || `Variation ${offVariation + 1}`}
            </span>
          </div>
        )}

        {/* Serve section — greyed out when targeting is OFF */}
        <div className={cn(!enabled && 'pointer-events-none opacity-50')}>
          <div className="flex items-center gap-3">
            <Button
              variant={isRollout ? 'outline' : 'secondary'}
              size="sm"
              onClick={() => {
                if (isRollout) handleTypeToggle();
              }}
              className="text-xs"
            >
              Specific variation
            </Button>
            <Button
              variant={isRollout ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => {
                if (!isRollout) handleTypeToggle();
              }}
              className="text-xs"
            >
              Percentage rollout
            </Button>
          </div>

          <div className="mt-3">
            {isRollout ? (
              <PercentageRollout
                rollout={fallthrough.rollout!}
                variations={variations}
                onChange={(rollout) =>
                  dispatch({ type: 'SET_FALLTHROUGH_ROLLOUT', payload: rollout })
                }
              />
            ) : (
              <Select
                value={String(fallthrough.variation ?? 0)}
                onValueChange={(val) =>
                  dispatch({ type: 'SET_FALLTHROUGH_VARIATION', payload: Number(val) })
                }
              >
                <SelectTrigger className="h-9 w-[240px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {variations.map((v, i) => (
                    <SelectItem key={i} value={String(i)}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block size-2 rounded-full"
                          style={{
                            backgroundColor: VARIATION_COLORS[i % VARIATION_COLORS.length],
                          }}
                        />
                        {v.name || `Variation ${i + 1}`}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Fallback info row */}
        <Separator />
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span>
            If evaluation encounters an error, the off-variation (
            <span className="font-medium text-foreground">
              {offVariationData?.name || `Variation ${offVariation + 1}`}
            </span>
            ) will be served as a fallback.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
