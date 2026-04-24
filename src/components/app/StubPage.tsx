import { Card } from "@/components/ui/card";
export const StubPage = ({ title, description }: { title: string; description: string }) => (
  <div className="space-y-6">
    <div><h1 className="text-2xl md:text-3xl font-bold">{title}</h1><p className="text-muted-foreground">{description}</p></div>
    <Card className="p-10 text-center text-muted-foreground">
      Em construção nesta fase. Será entregue na próxima iteração.
    </Card>
  </div>
);
