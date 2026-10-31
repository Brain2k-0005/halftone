import {
  Button,
  Column,
  type ColumnProps,
  Heading,
  Icon,
  Row,
  Text,
  Tooltip,
  TooltipTrigger,
} from '@umami/react-zen';
import { type ReactNode, useState } from 'react';
import { useMessages } from '@/components/hooks';
import { Maximize, X } from '@/components/icons';

export interface PanelProps extends ColumnProps {
  title?: string;
  description?: string;
  allowFullscreen?: boolean;
  toolbar?: ReactNode;
}

const fullscreenStyles = {
  position: 'fixed',
  width: '100vw',
  height: '100vh',
  top: 0,
  left: 0,
  border: 'none',
  zIndex: 9999,
} as any;

export function Panel({
  title,
  description,
  allowFullscreen,
  toolbar,
  style,
  children,
  height,
  width,
  ...props
}: PanelProps) {
  const { t, labels } = useMessages();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const hasHeader = title || description;

  return (
    <Column
      paddingY="5"
      paddingX={{ base: '3', md: '5' }}
      border
      borderRadius
      backgroundColor="surface"
      position="relative"
      gap
      {...props}
      className={['reui-card reui-dither', props.className].filter(Boolean).join(' ')}
      style={{ ...style, ...(isFullscreen ? fullscreenStyles : { height, width }) }}
    >
      {hasHeader && (
        <Column gap="1">
          {title && (
            <Heading size="sm" className="reui-card-title">
              {title}
            </Heading>
          )}
          {description && <Text className="reui-card-description">{description}</Text>}
        </Column>
      )}
      {(allowFullscreen || toolbar) && (
        <Row
          justifyContent="flex-end"
          alignItems="center"
          gap
          style={hasHeader ? { position: 'absolute', top: 16, right: 16 } : undefined}
        >
          {toolbar}
          {allowFullscreen &&
            (isFullscreen ? (
              <Button size="sm" variant="quiet" onPress={handleFullscreen}>
                <Icon>
                  <X />
                </Icon>
              </Button>
            ) : (
              <TooltipTrigger delay={0}>
                <Button size="sm" variant="quiet" onPress={handleFullscreen}>
                  <Icon>
                    <Maximize />
                  </Icon>
                </Button>
                <Tooltip>{t(labels.maximize)}</Tooltip>
              </TooltipTrigger>
            ))}
        </Row>
      )}
      {children}
    </Column>
  );
}
