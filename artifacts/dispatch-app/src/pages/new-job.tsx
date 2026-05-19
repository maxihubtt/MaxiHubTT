import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { useCreateJob, getListJobsQueryKey, getGetJobStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Send } from "lucide-react";

const formSchema = z.object({
  pickup: z.string().min(5, "Pickup address must be at least 5 characters"),
  dropoff: z.string().min(5, "Dropoff address must be at least 5 characters"),
  name: z.string().min(2, "Customer name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  price: z.string().min(1, "Price is required").regex(/^\d+(\.\d{1,2})?$/, "Must be a valid amount (e.g. 25.50)"),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewJob() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createJob = useCreateJob();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pickup: "",
      dropoff: "",
      name: "",
      phone: "",
      price: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    createJob.mutate({ data: values }, {
      onSuccess: (job) => {
        toast({
          title: "Job Dispatched",
          description: `Job #${job.id.slice(0,8)} broadcasted to Telegram.`,
        });
        queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetJobStatsQueryKey() });
        setLocation("/admin");
      },
      onError: (error) => {
        toast({
          title: "Failed to dispatch",
          description: (error as { error?: string }).error || "An error occurred",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold uppercase tracking-tight">Dispatch New Job</h1>
          <p className="text-muted-foreground font-mono mt-2">Fill details to broadcast to fleet immediately.</p>
        </div>

        <Card className="p-6 border-primary/20 shadow-[0_0_30px_-15px_rgba(191,255,0,0.1)]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                  <div className="h-6 w-6 rounded bg-primary/10 text-primary flex items-center justify-center font-mono text-xs font-bold">1</div>
                  <h3 className="uppercase tracking-wider text-sm font-semibold">Route Details</h3>
                </div>
                
                <FormField
                  control={form.control}
                  name="pickup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Pickup Address</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 123 Terminal Blvd, Gate A" className="font-medium bg-muted/20" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="dropoff"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Dropoff Address</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 456 Destination Pkwy" className="font-medium bg-muted/20" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                  <div className="h-6 w-6 rounded bg-primary/10 text-primary flex items-center justify-center font-mono text-xs font-bold">2</div>
                  <h3 className="uppercase tracking-wider text-sm font-semibold">Customer & Pricing</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Customer Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Jane Doe" className="bg-muted/20" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Contact Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 555-0123" className="font-mono bg-muted/20" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Payout Price ($)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">$</span>
                          <Input placeholder="45.00" className="pl-8 font-mono text-lg font-bold bg-muted/20" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-6 border-t border-border">
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full font-bold uppercase tracking-wider text-md"
                  disabled={createJob.isPending}
                >
                  {createJob.isPending ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Transmitting...</>
                  ) : (
                    <><Send className="mr-2 h-5 w-5" /> Dispatch to Fleet</>
                  )}
                </Button>
              </div>

            </form>
          </Form>
        </Card>
      </div>
    </Layout>
  );
}
