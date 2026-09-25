import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@weeeha/ui/components/empty";
import { Package } from "lucide-react";

export function PropsPage() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Package />
          </EmptyMedia>
          <EmptyTitle>Props arrive in S2</EmptyTitle>
          <EmptyDescription>
            The prop library, import and placement land in the next slice.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
