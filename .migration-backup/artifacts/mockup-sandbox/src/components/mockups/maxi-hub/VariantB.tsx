import React, { useState, useEffect } from "react";
import { MapPin, Navigation, User, Phone, ArrowRight, ShieldCheck, CreditCard, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const LOCATIONS = [
  { id: "pos", name: "Port of Spain", zone: 1 },
  { id: "san", name: "San Fernando", zone: 3 },
  { id: "cha", name: "Chaguanas", zone: 2 },
  { id: "ari", name: "Arima", zone: 2 },
  { id: "pia", name: "Piarco Airport", zone: 2 },
  { id: "cou", name: "Couva", zone: 3 },
];

const FARE_BASE = 40;
const FARE_PER_ZONE = 45;

export function VariantB() {
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [fare, setFare] = useState<number | null>(null);

  useEffect(() => {
    if (pickup && dropoff && pickup !== dropoff) {
      setIsCalculating(true);
      const timer = setTimeout(() => {
        const pickupLoc = LOCATIONS.find((l) => l.id === pickup);
        const dropoffLoc = LOCATIONS.find((l) => l.id === dropoff);
        
        if (pickupLoc && dropoffLoc) {
          const zoneDiff = Math.abs(pickupLoc.zone - dropoffLoc.zone);
          const calculatedFare = FARE_BASE + (zoneDiff * FARE_PER_ZONE) + (zoneDiff === 0 ? 25 : 0);
          setFare(calculatedFare);
        }
        setIsCalculating(false);
      }, 600);
      return () => clearTimeout(timer);
    } else {
      setFare(null);
    }
  }, [pickup, dropoff]);

  const deposit = fare ? Math.round(fare * 0.25) : null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-600 selection:text-white pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-5xl">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-1.5 rounded-lg">
              <Navigation className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">Maxi Hub TT</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#" className="hover:text-blue-600 transition-colors">How it works</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Safety</a>
            <Button variant="outline" className="border-slate-300 font-semibold">Log In</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-12 max-w-5xl">
        <div className="grid lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Column: Hero & Calculator Context */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-4">
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200 font-semibold px-3 py-1">
                Reliable Maxi Taxi Booking
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight tracking-tight">
                Your ride across <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  Trinidad & Tobago
                </span>
              </h1>
              <p className="text-lg text-slate-600 max-w-lg leading-relaxed">
                Book a private maxi taxi for group events, airport transfers, or cross-country trips. See your fare instantly.
              </p>
            </div>

            <div className="rounded-2xl overflow-hidden relative shadow-xl border border-slate-200/50 bg-white">
              <div className="aspect-[21/9] bg-slate-200 relative">
                <img 
                  src="/__mockup/images/maxi-hero-b.png" 
                  alt="Modern map route" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent flex items-end p-6">
                  <div className="flex items-center gap-3 text-white">
                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                    <span className="font-medium text-sm">Verified drivers • Sanitized vehicles • Punctual service</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="border-none shadow-sm bg-white">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
                    <Navigation className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Island-wide</h3>
                    <p className="text-sm text-slate-500 mt-1">From Port of Spain to San Fernando, we cover it all.</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm bg-white">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Secure Booking</h3>
                    <p className="text-sm text-slate-500 mt-1">25% deposit secures your ride. Pay the rest later.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column: Interactive Booking Form */}
          <div className="lg:col-span-5 relative">
            <Card className="border-slate-200 shadow-2xl bg-white sticky top-24 overflow-hidden">
              <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 to-indigo-600"></div>
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-bold text-slate-900">Request a Ride</CardTitle>
                <CardDescription className="text-base">Fill out the details to get your instant fare.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Route Selection */}
                <div className="relative space-y-4">
                  <div className="absolute left-4 top-[32px] bottom-[32px] w-[2px] bg-slate-200 z-0"></div>
                  
                  <div className="space-y-1.5 relative z-10">
                    <Label htmlFor="pickup" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-10">Pickup Location</Label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-3 w-3 h-3 rounded-full border-2 border-slate-900 bg-white z-10"></div>
                      <Select value={pickup} onValueChange={setPickup}>
                        <SelectTrigger id="pickup" className="pl-10 h-12 bg-slate-50 border-slate-200 hover:border-slate-300 transition-colors focus:ring-blue-600">
                          <SelectValue placeholder="Where are you leaving from?" />
                        </SelectTrigger>
                        <SelectContent>
                          {LOCATIONS.map((loc) => (
                            <SelectItem key={`p-${loc.id}`} value={loc.id}>{loc.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5 relative z-10">
                    <Label htmlFor="dropoff" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-10">Dropoff Location</Label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-3 w-3 h-3 rounded-none bg-blue-600 z-10"></div>
                      <Select value={dropoff} onValueChange={setDropoff}>
                        <SelectTrigger id="dropoff" className="pl-10 h-12 bg-slate-50 border-slate-200 hover:border-slate-300 transition-colors focus:ring-blue-600">
                          <SelectValue placeholder="Where are you going?" />
                        </SelectTrigger>
                        <SelectContent>
                          {LOCATIONS.map((loc) => (
                            <SelectItem key={`d-${loc.id}`} value={loc.id} disabled={pickup === loc.id}>{loc.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Passenger Details */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-slate-700 font-medium">Passenger Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                      <Input id="name" placeholder="John Doe" className="pl-10 h-11 border-slate-200 focus-visible:ring-blue-600" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-slate-700 font-medium">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                      <Input id="phone" placeholder="(868) 555-0123" className="pl-10 h-11 border-slate-200 focus-visible:ring-blue-600" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Dynamic Fare Display */}
                <div className={`mt-6 transition-all duration-300 ease-in-out origin-top overflow-hidden rounded-xl border ${fare ? 'border-blue-200 bg-blue-50/50 opacity-100 max-h-[300px]' : 'border-transparent bg-transparent opacity-0 max-h-0'}`}>
                  <div className="p-5">
                    {isCalculating ? (
                      <div className="flex items-center justify-center space-x-2 py-4">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                        <span className="text-sm font-medium text-slate-500 ml-2">Calculating route...</span>
                      </div>
                    ) : fare ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Estimated Fare</p>
                            <p className="text-3xl font-bold text-slate-900 mt-1">TTD {fare.toFixed(2)}</p>
                          </div>
                          <Badge variant="outline" className="bg-white text-slate-600 border-slate-200">
                            Up to 12 seats
                          </Badge>
                        </div>
                        
                        <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                          <div className="flex gap-3">
                            <CreditCard className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold text-slate-900 flex items-center gap-2">
                                25% Deposit Required
                                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[10px] px-1.5 py-0">TTD {deposit?.toFixed(2)}</Badge>
                              </p>
                              <p className="text-sm text-slate-600 mt-1 leading-snug">
                                Secure your ride instantly. The remaining balance of TTD {(fare - (deposit || 0)).toFixed(2)} can be paid to the driver.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Submit */}
                <Button 
                  className="w-full h-14 text-lg font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
                  disabled={!fare || !name || !phone}
                  size="lg"
                >
                  {fare ? "Confirm & Pay Deposit" : "Fill details to calculate fare"}
                  {fare && <ArrowRight className="ml-2 w-5 h-5" />}
                </Button>
                
                <p className="text-center text-xs text-slate-400 font-medium">
                  By booking, you agree to our Terms of Service.
                </p>

              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

export default VariantB;
