import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Navigation, User, Phone, CheckCircle2, Info } from "lucide-react";

export function VariantA() {
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Simple fare calculator
  const calculateFare = () => {
    if (!pickup || !dropoff) return 0;
    if (pickup === dropoff) return 20;
    
    // Fictional base matrix
    const locations = ["Port of Spain", "San Fernando", "Chaguanas", "Arima", "Diego Martin", "Sangre Grande"];
    const pIdx = locations.indexOf(pickup);
    const dIdx = locations.indexOf(dropoff);
    
    if (pIdx === -1 || dIdx === -1) return 50;
    
    // Distance-based fictional logic
    const distance = Math.abs(pIdx - dIdx);
    return 40 + (distance * 25);
  };

  const fare = calculateFare();
  const deposit = fare > 0 ? fare * 0.25 : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 1500);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-amber-200">
          <CardContent className="pt-10 pb-8 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10 text-teal-600" />
            </div>
            <h2 className="text-2xl font-bold text-teal-950 mb-2">Booking Confirmed!</h2>
            <p className="text-teal-800/70 mb-6">
              Thank you, {name}. Your ride from {pickup} to {dropoff} is scheduled.
            </p>
            <p className="text-sm font-medium text-amber-600 bg-amber-100 px-4 py-2 rounded-full mb-8">
              Deposit Paid: TTD {deposit.toFixed(2)}
            </p>
            <Button 
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
              onClick={() => {
                setIsSuccess(false);
                setPickup("");
                setDropoff("");
                setName("");
                setPhone("");
              }}
            >
              Book Another Ride
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBF4] text-teal-950 font-sans selection:bg-amber-200">
      {/* Header */}
      <header className="bg-teal-900 text-amber-50 py-4 px-6 md:px-12 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <div className="bg-amber-500 w-8 h-8 rounded flex items-center justify-center shadow-inner">
            <span className="font-bold text-teal-900">M</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">Maxi Hub TT</h1>
        </div>
        <nav className="hidden md:flex gap-6 text-sm font-medium text-teal-100">
          <a href="#" className="hover:text-amber-400 transition-colors">How it works</a>
          <a href="#" className="hover:text-amber-400 transition-colors">Routes</a>
          <a href="#" className="hover:text-amber-400 transition-colors">Contact</a>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-12 pb-20">
        
        {/* Left Column: Visuals & Vibe */}
        <div className="relative">
          <div className="h-[30vh] lg:h-full w-full overflow-hidden relative">
            <img 
              src="/__mockup/images/maxi-hero-a.png" 
              alt="Sunny Trinidad Maxi Taxi"
              className="w-full h-full object-cover object-center absolute inset-0"
            />
            {/* Gradient overlay for blending */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#FFFBF4] via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-[#FFFBF4]"></div>
          </div>
          
          <div className="absolute bottom-0 lg:bottom-auto lg:top-1/3 left-0 w-full lg:w-11/12 p-6 lg:p-12 z-10">
            <div className="bg-[#FFFBF4]/80 backdrop-blur-md p-6 lg:p-8 rounded-2xl shadow-2xl border border-white/50 inline-block">
              <h2 className="text-3xl lg:text-5xl font-extrabold text-teal-900 leading-tight mb-4">
                Your reliable ride <br/><span className="text-amber-600">across the island.</span>
              </h2>
              <p className="text-teal-800/80 text-lg max-w-md">
                Fast, safe, and comfortable maxi taxis. See your fare upfront and secure your seat in seconds.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Booking Form */}
        <div className="p-6 md:p-12 lg:py-16 flex items-center justify-center z-10 relative">
          <Card className="w-full max-w-lg shadow-xl shadow-amber-900/5 border-amber-100 bg-white/70 backdrop-blur-sm rounded-3xl overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-amber-400 via-amber-500 to-teal-500 w-full" />
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl text-teal-900">Book Your Maxi</CardTitle>
              <CardDescription className="text-teal-700/70">
                Fill in your details for an instant fare estimate.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                
                <div className="space-y-4 relative">
                  <div className="absolute left-[15px] top-[32px] bottom-[32px] w-[2px] bg-amber-200 z-0 hidden md:block"></div>
                  
                  <div className="space-y-2 relative z-10">
                    <Label htmlFor="pickup" className="text-teal-900 font-semibold flex items-center gap-2">
                      <div className="bg-amber-100 p-1 rounded-full"><MapPin className="w-4 h-4 text-amber-600" /></div>
                      Pickup Location
                    </Label>
                    <div className="relative">
                      <select 
                        id="pickup"
                        className="w-full h-12 px-4 rounded-xl border-2 border-teal-100 bg-white focus:border-teal-500 focus:ring-0 text-teal-900 transition-colors"
                        value={pickup}
                        onChange={(e) => setPickup(e.target.value)}
                        required
                      >
                        <option value="" disabled>Select pickup town...</option>
                        <option value="Port of Spain">Port of Spain</option>
                        <option value="Diego Martin">Diego Martin</option>
                        <option value="San Fernando">San Fernando</option>
                        <option value="Chaguanas">Chaguanas</option>
                        <option value="Arima">Arima</option>
                        <option value="Sangre Grande">Sangre Grande</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2 relative z-10">
                    <Label htmlFor="dropoff" className="text-teal-900 font-semibold flex items-center gap-2">
                      <div className="bg-teal-100 p-1 rounded-full"><Navigation className="w-4 h-4 text-teal-600" /></div>
                      Dropoff Location
                    </Label>
                    <div className="relative">
                      <select 
                        id="dropoff"
                        className="w-full h-12 px-4 rounded-xl border-2 border-teal-100 bg-white focus:border-teal-500 focus:ring-0 text-teal-900 transition-colors"
                        value={dropoff}
                        onChange={(e) => setDropoff(e.target.value)}
                        required
                      >
                        <option value="" disabled>Select dropoff town...</option>
                        <option value="Port of Spain">Port of Spain</option>
                        <option value="Diego Martin">Diego Martin</option>
                        <option value="San Fernando">San Fernando</option>
                        <option value="Chaguanas">Chaguanas</option>
                        <option value="Arima">Arima</option>
                        <option value="Sangre Grande">Sangre Grande</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-teal-900">Passenger Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-600/50" />
                      <Input 
                        id="name" 
                        placeholder="e.g. David" 
                        className="pl-9 h-11 border-teal-100 rounded-xl focus-visible:ring-teal-500" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-teal-900">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-600/50" />
                      <Input 
                        id="phone" 
                        type="tel" 
                        placeholder="868-XXX-XXXX" 
                        className="pl-9 h-11 border-teal-100 rounded-xl focus-visible:ring-teal-500"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Dynamic Fare & Deposit Box */}
                <div className={`transition-all duration-500 ease-in-out overflow-hidden rounded-2xl border ${fare > 0 ? 'bg-amber-50/80 border-amber-200 p-5 opacity-100 max-h-[500px]' : 'bg-transparent border-transparent p-0 max-h-0 opacity-0'}`}>
                  {fare > 0 && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center pb-3 border-b border-amber-200/50">
                        <span className="text-teal-800 font-medium">Estimated Fare</span>
                        <span className="text-2xl font-bold text-teal-900">TTD {fare.toFixed(2)}</span>
                      </div>
                      <div className="flex gap-3 items-start bg-white/60 p-3 rounded-xl border border-amber-100">
                        <Info className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-teal-900">25% Deposit Required: TTD {deposit.toFixed(2)}</p>
                          <p className="text-xs text-teal-700/80 mt-1 leading-relaxed">
                            To confirm your booking and hold your seat, a small deposit is required now. The remaining balance of TTD {(fare - deposit).toFixed(2)} is due to the driver.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Button 
                  type="submit" 
                  disabled={!fare || isSubmitting}
                  className="w-full h-14 text-lg font-semibold bg-amber-500 hover:bg-amber-600 text-teal-950 rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98]"
                >
                  {isSubmitting ? "Processing..." : fare > 0 ? `Pay TTD ${deposit.toFixed(2)} to Book` : "Select Route to See Fare"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default VariantA;
