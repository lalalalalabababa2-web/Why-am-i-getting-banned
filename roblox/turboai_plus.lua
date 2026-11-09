--[[
    TurboAI Plus 1.1 - upgrade for TurboSoccerAI 0.8.0 (Turbo Soccer [BETA])

    loadstring(game:HttpGet("https://raw.githubusercontent.com/lalalalalabababa2-web/Why-am-i-getting-banned/ccr-c8ff314b-e969wb/roblox/turboai_plus.lua"))()

    Run it before or after the Turbo AI script; either order works.
      - already running: the live bot is upgraded on the spot
      - started later:   Turbo AI loads with the upgraded Tactics module

    What changes (everything else, including the Nexto neural net, is untouched):
      - kickoffs: no steering while the car flips (that spun it sideways), and it boosts
        all the way to the ball instead of stopping at 3/4 speed
      - retreat: when you're upfield of the ball in your own half and the opponent gets
        there first, it drives back goal-side instead of wandering off for boost
      - guard: while the opponent has the ball near your half, no boost-pad runs away from
        the play; it holds the spot between ball and goal (2.5s at most, then hands back)
      - demo hop: jumps over a supersonic car that's about to ram you

    No UI: nothing on screen changes. Everything is on by default; to switch a part off, run e.g.
        getgenv().TurboAIPlus = { guard = false }
    (keys: earlyFlip, fullBoostKickoff, retreat, guard, demoHop). The executor console shows
    "[TurboAI Plus 1.1] ..." when it loads.

    License: the Tactics module below is a modified version of TurboSoccerAI's Tactics module,
    CC BY-NC-SA 4.0 (https://creativecommons.org/licenses/by-nc-sa/4.0/).
    Nexto: Rolv, Soren and contributors; Luau port/weights: azulacs/Catware.
    This file is shared under the same license.
]]

local TACTICS_SOURCE = [==[
-- Adaptation: CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/
-- Nexto: Rolv, Soren, contributors; port/weights: azulacs/Catware. See packaged NOTICE.
-- Modified for TurboAI Plus (same CC BY-NC-SA 4.0 license): no steering/yaw/roll during kickoff
-- dodges (it spun the car sideways), boost all the way to the ball on kickoffs; retreat goal-side when beaten;
-- guard (no boost runs while the opponent has the ball); demo hop.
local Tactics={}
Tactics.PLUS_VERSION="1.1"
-- live settings, readable/changeable from the executor: getgenv().TurboAIPlus
local function plus()
local env=type(getgenv)=="function" and getgenv() or _G
local cfg=type(env.TurboAIPlus)=="table" and env.TurboAIPlus or {}
return cfg.retreat~=false,cfg.demoHop~=false,cfg.earlyFlip~=false,cfg.fullBoostKickoff~=false,cfg.guard~=false
end
Tactics.__index=Tactics
local function finite(n) return type(n)=="number" and n==n and math.abs(n)<math.huge end
local function vec(v) return type(v)=="table" and finite(v.x) and finite(v.y) and finite(v.z) end
local function len(x,y) return math.sqrt(x*x+y*y) end
local function clamp(x) return math.clamp(x,-1,1) end
local function output(phase)
return {throttle=0,steer=0,pitch=0,yaw=0,roll=0,jump=false,boost=false,handbrake=false,
phase=phase,active=true,confidence=.8}
end
local function drive(s,target,phase,urgent)
local c=s.car
local dx,dy=target.x-c.pos.x,target.y-c.pos.y
local distance=len(dx,dy)
local a=output(phase);a.target=target
local f=len(c.fwd.x,c.fwd.y);local r=len(c.right.x,c.right.y)
if f<.2 or r<.2 then return nil end
local fx,fy,rx,ry=c.fwd.x/f,c.fwd.y/f,c.right.x/r,c.right.y/r
local along=c.vel.x*fx+c.vel.y*fy
if distance<.65 then a.throttle=clamp(-along*.6);return a end
local front=(dx*fx+dy*fy)/distance
local side=(dx*rx+dy*ry)/distance
local angle=math.atan2(side,front)
local yaw=c.angVel and (c.angVel.x*c.up.x+c.angVel.y*c.up.y+c.angVel.z*c.up.z) or 0
a.steer=clamp(angle*1.7-yaw*.22)
if front<-.72 and distance<(urgent and 6 or 12) and math.abs(along)<(urgent and 6 or 5) then
local wanted=-math.min(7,math.sqrt(18*math.max(0,distance-.3)))
a.throttle=clamp((wanted-along)*.35);a.steer=-clamp(math.atan2(-side,-front)*1.6)
else
local wanted=urgent and 23 or math.min(12,math.sqrt(30*math.max(0,distance-.5)))
wanted=wanted*math.max(.15,1-math.abs(angle)/math.pi)
a.throttle=clamp((wanted-along)*.35)
if math.abs(angle)>1.5 and along>7 then a.throttle=-.8 end
end
a.boost=urgent and s.allowBoost~=false and (s.boost or 0)>1 and front>.97 and a.throttle>.8
and distance>5 and along<22.5
a.handbrake=math.abs(angle)>1.2 and along>7 and not urgent
return a
end
local function contact(s,phase,attack)
local c,b=s.car,s.ball
local dx,dy=b.pos.x-c.pos.x,b.pos.y-c.pos.y
local distance=len(dx,dy);local f=len(c.fwd.x,c.fwd.y)
local front=distance>.01 and f>.2 and (dx*c.fwd.x+dy*c.fwd.y)/(distance*f) or -1
local a=drive(s,{x=b.pos.x,y=b.pos.y+attack*2,z=b.pos.z},phase,true)
if a and dy*attack>.35 and front>.96 then
a.throttle=1
a.boost=s.allowBoost~=false and (s.boost or 0)>1 and c.grounded and math.abs(c.fwd.z)<.25
end
return a,front,distance
end
function Tactics.new() local self=setmetatable({},Tactics);self:reset();return self end
function Tactics:reset()
self.done,self.dodge,self.lastTime,self.started=false,nil,nil,nil
self.didDodge=false;self.saveJumpUntil=0;self.contactUntil=nil
self.shotDodge=nil;self.lastShot=-math.huge
self.defense=nil;self.lastCar=nil;self.lastBall=nil;self.lastCentered=nil
self.dodgeAir=false;self.dodgeSecond=false;self.didFinal=false;self.lastDodge=-math.huge;self.role=nil
end
local function arrival(s,p)
local c=s.car;local dx,dy=p.x-c.pos.x,p.y-c.pos.y;local distance=len(dx,dy)
if distance<1.85 and p.z<1.45 then return 0,0 end
local f=len(c.fwd.x,c.fwd.y);if f<.2 then return math.huge,0 end
local front=distance>.01 and (dx*c.fwd.x+dy*c.fwd.y)/(distance*f) or 1
local angle=math.acos(math.clamp(front,-1,1));local reverse=front<-.72 and distance<6 and len(c.vel.x,c.vel.y)<6
if reverse then angle=math.pi-angle end
local turn=.08+angle*.34;local speed=distance>.01 and math.max(0,(c.vel.x*dx+c.vel.y*dy)/distance) or 0
speed=math.max(0,speed-turn*4)
local boost=s.allowBoost~=false and angle<.7 and math.clamp(s.boost or 0,0,100) or 0
local cap=reverse and 7 or 15.5+math.min(7.5,boost*.12)
local accel=reverse and 4.5 or 10+math.min(6,boost*.12)
speed=math.min(cap,speed);local travel=math.max(0,distance-1.85)
local ramp=(cap-speed)/accel;local rampDistance=(speed+cap)*ramp*.5
local move=travel<=rampDistance and (math.sqrt(speed*speed+2*accel*travel)-speed)/accel or ramp+(travel-rampDistance)/cap
local jump=0
if p.z>1.45 then
if s.allowJump==false or c.hasDoubleJumped then return math.huge,0 end
jump=math.huge;local g=finite(s.gravity) and math.clamp(s.gravity,3,15) or 6.5
for i=1,28 do
local t=i*.025;local hold=math.min(.16,t)
if c.pos.z+1.2+2.92*t+14*(hold*t-.5*hold*hold)-.5*g*t*t>=p.z then jump=t;break end
end
end
return turn+math.max(move,jump),jump
end
local function clearDirection(s,attack)
local b=s.ball.pos;local side=b.x>=s.ownGoal.x and 1 or -1
local function room(sign)
local nx,ny=sign*.625,attack*.781;local clearance=8
for _,other in ipairs(type(s.opponents)=="table" and s.opponents or {}) do
if type(other)=="table" and vec(other.pos) then
local dx,dy=other.pos.x-b.x,other.pos.y-b.y;local along=dx*nx+dy*ny
if along>0 and along<14 then clearance=math.min(clearance,math.abs(dx*ny-dy*nx)) end
end
end
return clearance
end
if math.abs(b.x-s.ownGoal.x)<3 and room(-side)>room(side)+1 then side=-side end
return side*.625,attack*.781,side
end
local function threat(s,attack)
local b=s.ball;local toward=b.vel.y*attack
local crossing=toward< -1 and (s.ownGoal.y-b.pos.y)/b.vel.y or -1
if crossing<=0 or crossing>3 then return nil end
local g=finite(s.gravity) and math.clamp(s.gravity,3,15) or 6.5
local x,y,z,vx,vy,vz=b.pos.x,b.pos.y,b.pos.z,b.vel.x,b.vel.y,b.vel.z
local count=math.max(20,math.ceil(crossing/.09));local dt=crossing/count;local samples={}
local half=(finite(s.arenaHalfWidth) and math.clamp(s.arenaHalfWidth,10,100) or 40.96)-.93
for i=1,count do
x=x+vx*dt;y=y+vy*dt
if z<=.95 and math.abs(vz)<.5 then z=.93;vz=0 else
z=z+vz*dt-.5*g*dt*dt;vz=vz-g*dt
if z<.93 then z=.93+(.93-z)*.6;vz=math.abs(vz)*.6 end
end
if x>half then x=2*half-x;vx=-math.abs(vx)*.7 elseif x< -half then x=-2*half-x;vx=math.abs(vx)*.7 end
samples[i]={x=x,y=y,z=z,t=i*dt}
end
local final=samples[count];local width=finite(s.goalHalfWidth) and math.clamp(s.goalHalfWidth,5,15) or 8.9
if math.abs(final.x-s.ownGoal.x)>width+.9 or final.z>6.6 then return nil end
return samples,final,crossing,width
end
local function powerShot(self,now,s,attack)
if s.neuralPrimary then self.shotDodge=nil;return nil end
local c,b=s.car,s.ball
if s.allowJump==false then self.shotDodge=nil end
if self.shotDodge then
local age=now-self.shotDodge
if age>.3 or (b.pos.y-c.pos.y)*attack<.2 or c.fwd.y*attack<.45
or b.pos.z>2.5 then self.shotDodge=nil;return nil end
local a=contact(s,"power_shot_dodge",attack) or output("power_shot_dodge")
a.boost=false
if age<.06 then a.jump=s.allowJump~=false
elseif age<.095 then a.jump=false
elseif age<.18 and not c.grounded and not c.hasDoubleJumped then a.jump=true;a.pitch=-1 end
return a
end
if not c.grounded or c.up.z<.8 or c.isFlipping or b.pos.z>1.65 or b.pos.z<.5 then return nil end
local dx,dy=b.pos.x-c.pos.x,b.pos.y-c.pos.y
local distance=len(dx,dy);local f=len(c.fwd.x,c.fwd.y)
local gx,gy=s.goal.x-b.pos.x,s.goal.y-b.pos.y;local gd=len(gx,gy)
if distance<1.5 or distance>6 or f<.2 or gd<3 or dy*attack<.7 or b.vel.y*attack< -2 then return nil end
local front=(dx*c.fwd.x+dy*c.fwd.y)/(distance*f)
local aim=(dx*gx+dy*gy)/(distance*gd)
local closing=((c.vel.x-b.vel.x)*dx+(c.vel.y-b.vel.y)*dy)/distance
if front<.98 or aim<.94 or c.fwd.y*attack/f<.65 or closing<1 or closing>24 then return nil end
local a=contact(s,"power_shot",attack)
if not a then return nil end
if s.allowJump~=false and not c.hasDoubleJumped and now-self.lastShot>.9
and distance<math.clamp(2+closing*.12,2.3,4.5) and len(c.vel.x,c.vel.y)>5 then
self.shotDodge=now;self.lastShot=now;a.jump=true;a.phase="power_shot_dodge";a.boost=false
end
return a
end
-- Beaten: we're upfield of the ball in our own half and the opponent gets there first (or it's
-- already coming at our goal). Go back goal-side on our side of the ball instead of chasing pads.
local function retreat(self,now,s,attack)
local c,b=s.car,s.ball
if not c.grounded or c.up.z<.7 or c.isFlipping then self.retreating=nil;return nil end
local upfield=(c.pos.y-b.pos.y)*attack
local depth=(b.pos.y-s.ownGoal.y)*attack
local mine=len(b.pos.x-c.pos.x,b.pos.y-c.pos.y)
local theirs=math.huge
for _,o in ipairs(type(s.opponents)=="table" and s.opponents or {}) do
if type(o)=="table" and vec(o.pos) then theirs=math.min(theirs,len(b.pos.x-o.pos.x,b.pos.y-o.pos.y)) end
end
local coming=b.vel.y*attack< -6
if upfield<=(self.retreating and 1 or 5) or depth>60 or not (theirs<mine-2 or coming) then
self.retreating=nil;return nil
end
self.retreating=self.retreating or now
local side=c.pos.x>=b.pos.x and 1 or -1
local target={x=s.ownGoal.x+side*5.5,y=s.ownGoal.y+attack*5,z=.17}
-- level with the ball and right in front of it: step around it first so we don't knock it home
if math.abs(c.pos.x-b.pos.x)<2.5 and upfield<8 then target={x=b.pos.x+side*3.5,y=b.pos.y,z=.17} end
local a=drive(s,target,"retreat",true)
if a then a.handbrake=false end
return a
end
-- The opponent has the ball near or heading into our half, and we're goal-side but driving away
-- from both the ball and our goal (a boost-pad run). Take the spot between ball and goal instead.
-- Hands control back once there, when the play changes, or after 2.5s.
local function guard(self,now,s,attack)
local c,b=s.car,s.ball
if not c.grounded or c.up.z<.7 or c.isFlipping then self.guarding=nil;return nil end
local mine=len(b.pos.x-c.pos.x,b.pos.y-c.pos.y)
local theirs=math.huge
for _,o in ipairs(type(s.opponents)=="table" and s.opponents or {}) do
if type(o)=="table" and vec(o.pos) then theirs=math.min(theirs,len(b.pos.x-o.pos.x,b.pos.y-o.pos.y)) end
end
local threatening=(b.pos.y-s.ownGoal.y)*attack<60 or b.vel.y*attack< -2
local goalSide=(b.pos.y-c.pos.y)*attack> -1
if theirs>mine-3 or not threatening or not goalSide or mine<6 then self.guarding=nil;return nil end
local ix,iy=b.pos.x-s.ownGoal.x,b.pos.y-s.ownGoal.y
local k=math.min(.4,30/math.max(len(ix,iy),1))
local target={x=s.ownGoal.x+ix*k,y=s.ownGoal.y+iy*k,z=.17}
if len(target.x-c.pos.x,target.y-c.pos.y)<4 then self.guarding=nil;return nil end
if not self.guarding then
local speed=len(c.vel.x,c.vel.y)
if speed<5 then return nil end
local vx,vy=c.vel.x/speed,c.vel.y/speed
local gx,gy=s.ownGoal.x-c.pos.x,s.ownGoal.y-c.pos.y;local gd=math.max(len(gx,gy),.01)
local away=(vx*(b.pos.x-c.pos.x)+vy*(b.pos.y-c.pos.y))/mine< -.2
local homeward=(vx*gx+vy*gy)/gd>.6
if not away or homeward then return nil end
self.guarding=now
elseif now-self.guarding>2.5 then
if now-self.guarding>4 then self.guarding=nil end
return nil
end
return drive(s,target,"guard",true)
end
-- A supersonic opponent about to ram us while we're not playing the ball: hop over it.
local function demoHop(self,now,s)
local c=s.car
if self.hopUntil and now<self.hopUntil then local a=output("demo_hop");a.jump=true;a.throttle=1;return a end
if s.allowJump==false or not c.grounded or c.up.z<.8 or c.isFlipping then return nil end
if now-(self.lastHop or -math.huge)<1.5 then return nil end
if len(s.ball.pos.x-c.pos.x,s.ball.pos.y-c.pos.y)<4 then return nil end
for _,o in ipairs(type(s.opponents)=="table" and s.opponents or {}) do
if type(o)=="table" and vec(o.pos) and vec(o.vel) and len(o.vel.x,o.vel.y)>21 and math.abs(o.pos.z-c.pos.z)<1.5 then
local dx,dy=c.pos.x-o.pos.x,c.pos.y-o.pos.y;local d=len(dx,dy)
local rvx,rvy=o.vel.x-c.vel.x,o.vel.y-c.vel.y;local rv=len(rvx,rvy)
if d>.5 and d<9 and rv>1 then
local closing=(rvx*dx+rvy*dy)/d
local miss=math.abs(rvx*dy-rvy*dx)/rv
if closing>8 and (d-1.2)/closing<.32 and miss<1.6 then
self.lastHop=now;self.hopUntil=now+.15
local a=output("demo_hop");a.jump=true;a.throttle=1;return a
end
end
end
end
return nil
end
local function openPlay(self,now,s,attack)
local useRetreat,useHop,_,_,useGuard=plus()
return useHop and demoHop(self,now,s) or powerShot(self,now,s,attack) or useRetreat and retreat(self,now,s,attack)
or useGuard and guard(self,now,s,attack) or nil
end
function Tactics:step(now,s)
if not finite(now) or type(s)~="table" or type(s.car)~="table" or type(s.ball)~="table" then self:reset();return nil end
local c,b=s.car,s.ball
if not vec(c.pos) or not vec(c.vel) or not vec(c.fwd) or not vec(c.right) or not vec(c.up)
or not vec(b.pos) or not vec(b.vel) or not vec(s.goal) or not vec(s.ownGoal)
or c.angVel~=nil and not vec(c.angVel) or s.boost~=nil and not finite(s.boost)
or type(c.grounded)~="boolean" or c.hasDoubleJumped~=nil and type(c.hasDoubleJumped)~="boolean"
or c.isFlipping~=nil and type(c.isFlipping)~="boolean" or c.isDemoed or len(c.vel.x,c.vel.y)>80 or len(b.vel.x,b.vel.y)>250 then self:reset();return nil end
for _,key in ipairs({"allowJump","allowBoost","kickoffs","goalkeeper","neuralPrimary"}) do
if s[key]~=nil and type(s[key])~="boolean" then self:reset();return nil end
end
if self.lastTime and (now<self.lastTime or now-self.lastTime>.6) then self:reset() end
self.lastTime=now
local attack=s.goal.y>s.ownGoal.y and 1 or -1
local centered=len(b.pos.x,b.pos.y)<1.5 and b.pos.z<1.4 and len(b.vel.x,b.vel.y)<1.2 and math.abs(b.vel.z)<.6
local spawn=c.grounded and c.pos.y*attack< -16 and len(c.pos.x,c.pos.y)>21 and len(c.vel.x,c.vel.y)<4
if self.done and centered and spawn and self.lastCar and self.lastBall then
if len(c.pos.x-self.lastCar.x,c.pos.y-self.lastCar.y)>12 or
not self.lastCentered and len(b.pos.x-self.lastBall.x,b.pos.y-self.lastBall.y)>6 then self:reset() end
end
self.lastCar={x=c.pos.x,y=c.pos.y};self.lastBall={x=b.pos.x,y=b.pos.y};self.lastCentered=centered;self.lastTime=now
if not c.grounded and now<self.saveJumpUntil and s.allowJump~=false then
local a=output("goalkeeper_jump");a.jump=true;a.throttle=.5;return a
end
local samples,crossingBall,crossing,width=threat(s,attack)
if samples and c.grounded and c.up.z>.7 then
local chosen,eta,jump
for _,p in ipairs(samples) do
if p.z<=3.05 and p.t>.06 then
local arrivalTime,jumpTime=arrival(s,p)
if arrivalTime<=p.t+.02 then chosen,eta,jump=p,arrivalTime,jumpTime;break end
end
end
if chosen then
local target={x=chosen.x,y=chosen.y+attack*.9,z=chosen.z}
if chosen.z<1.5 and (chosen.y-s.ownGoal.y)*attack<12 then
local nx,ny=clearDirection(s,attack);target.x=target.x+nx*.9;target.y=chosen.y+ny*.9
end
if (target.y-s.ownGoal.y)*attack<3 then target.x=math.clamp(target.x,s.ownGoal.x-width+1.5,s.ownGoal.x+width-1.5) end
local old=self.defense
if old and now<old.untilAt and math.abs(old.crossX-crossingBall.x)<1.3
and math.abs(old.crossAt-now-crossing)<.2 and old.at-now>.05 then
local reachable,oldJump=arrival(s,old.target)
if reachable<=old.at-now+.02 then target=old.target;chosen.t=old.at-now;chosen.z=target.z;eta=reachable;jump=oldJump end
else
self.defense={target=target,untilAt=now+.12,at=now+chosen.t,crossX=crossingBall.x,crossAt=now+crossing}
end
local a=drive(s,target,"goalkeeper_save",true)
if a then
a.arrivalTime=eta;a.interceptTime=chosen.t;a.threatTime=crossing
local distance=len(chosen.x-c.pos.x,chosen.y-c.pos.y)
a.jump=s.allowJump~=false and not c.hasDoubleJumped and not c.isFlipping and chosen.z>1.45
and chosen.t<=jump+.09 and distance<math.max(2.5,len(c.vel.x,c.vel.y)*(jump+.08)+1.5)
if a.jump then self.saveJumpUntil=now+math.min(.16,math.max(.08,jump)) end
return a
end
end
self.defense=nil
if crossingBall.z>3.05 then return nil end
local margin=math.min(7.2,width-1.5)
local cover={x=s.ownGoal.x+math.clamp(crossingBall.x-s.ownGoal.x,-margin,margin),y=s.ownGoal.y+attack*.55,z=.17}
if s.neuralPrimary and not s.goalkeeper and arrival(s,cover)>crossing+.2 then return nil end
return drive(s,cover,"goalkeeper_cover",true)
end
self.defense=nil
if s.goalkeeper==true and c.grounded and c.up.z>.7 then
self.shotDodge=nil
local depth=(b.pos.y-s.ownGoal.y)*attack;local carDepth=(c.pos.y-s.ownGoal.y)*attack
local dx,dy=b.pos.x-c.pos.x,b.pos.y-c.pos.y;local distance=len(dx,dy)
local nx,ny,side=clearDirection(s,attack)
if depth>-.6 and depth<5.5 and carDepth<3 and carDepth> -3 and math.abs(b.pos.x-s.ownGoal.x)<9
and b.pos.z<1.65 and distance<4.5 and dy*attack>.7 and dx*nx+dy*ny>.5
and math.abs(dx*ny-dy*nx)<2.2 then
local a=drive(s,{x=b.pos.x+nx*2,y=b.pos.y+ny*2,z=b.pos.z},"goalkeeper_clear",true)
if a then a.boost=false;a.clearSide=side;return a end
end
local bx=b.pos.x-s.ownGoal.x;local left=len(bx+8.8,depth);local right=len(bx-8.8,depth)
local x=8.8*(left-right)/math.max(.01,left+right)
if depth>.5 then x=bx+(x-bx)*(depth-.5)/depth end
return drive(s,{x=s.ownGoal.x+math.clamp(x,-7.2,7.2),y=s.ownGoal.y+attack*.5,z=.17},"goalkeeper_position",false)
end
if s.kickoffs==false then self.dodge=nil;self.started=nil;self.contactUntil=nil;self.role=nil;return openPlay(self,now,s,attack) end
if s.allowJump==false then self.dodge=nil end
if not centered then
if self.started and self.contactUntil and now<self.contactUntil and now-self.started<4.5
and len(b.pos.x-c.pos.x,b.pos.y-c.pos.y)<6 and (b.pos.y-c.pos.y)*attack>.35
and b.pos.z<1.65 then
return contact(s,"kickoff_contact",attack)
end
self.done=true;self.dodge=nil;self.started=nil;self.contactUntil=nil;self.role=nil
return openPlay(self,now,s,attack)
end
if self.done then return openPlay(self,now,s,attack) end
if self.started and now-self.started>4.5 then self.done=true;self.dodge=nil;return nil end
if not self.started then
if not c.grounded or c.pos.y*attack> -15 or len(c.pos.x,c.pos.y)<20 then return openPlay(self,now,s,attack) end
if type(s.teammates)~="table" then return nil end
local mine=len(c.pos.x,c.pos.y)
for _,other in ipairs(s.teammates) do
if type(other)~="table" or not vec(other.pos) then return nil end
local theirs=len(other.pos.x,other.pos.y)
if theirs<mine-1.5 or math.abs(theirs-mine)<=1.5 and other.pos.x*attack<c.pos.x*attack then
self.role="cover";self.started=now;break
end
end
self.started=now;self.role=self.role or "take"
end
if self.role=="cover" then return drive(s,{x=s.ownGoal.x,y=s.ownGoal.y+attack*4.5,z=.17},"kickoff_cover",false) end
local distance=len(b.pos.x-c.pos.x,b.pos.y-c.pos.y)
if (b.pos.y-c.pos.y)*attack<-.35 then self.done=true;self.dodge=nil;return nil end
if distance<4 then self.contactUntil=now+.35 end
local a=distance<5 and contact(s,"kickoff_contact",attack)
or drive(s,{x=b.pos.x,y=b.pos.y+attack*.6,z=.93},"kickoff_drive",true)
if not a and self.dodge then a=output("kickoff_dodge");a.throttle=1 end
if not a then return nil end
local front=((b.pos.x-c.pos.x)*c.fwd.x+(b.pos.y-c.pos.y)*c.fwd.y)/math.max(.01,distance)
local speed=len(c.vel.x,c.vel.y)
local closing=distance>.1 and ((c.vel.x-b.vel.x)*(b.pos.x-c.pos.x)+(c.vel.y-b.vel.y)*(b.pos.y-c.pos.y))/distance or 0
local final=not self.didFinal and distance>2.1 and distance<math.clamp(2+closing*.11,2.3,4.5) and closing>4
local _,_,earlyFlip=plus()
local early=earlyFlip and not self.didDodge and speed>10 and distance>18 and distance<34
if not self.dodge and (early or final) and c.grounded and not c.isFlipping and not c.hasDoubleJumped
and s.allowJump~=false and front>.99 and now-self.lastDodge>.65 then
self.dodge=now;self.dodgeAir=false;self.dodgeSecond=false
if final then self.didFinal=true else self.didDodge=true end
end
if self.dodge then
local age=now-self.dodge
self.dodgeAir=self.dodgeAir or not c.grounded
if age<.07 then a.jump=true
elseif age<.12 then a.jump=false
elseif age<.19 and not self.dodgeSecond and not c.grounded and not c.hasDoubleJumped
and not c.isFlipping and front>.97 and (b.pos.y-c.pos.y)*attack>.5 then
a.jump=true;a.pitch=-1;self.dodgeSecond=true
else a.jump=false end
a.phase="kickoff_dodge";a.steer=0;a.yaw=0;a.roll=0;a.handbrake=false
if age>.19 then a.pitch=0 end
if age>.8 or age>.28 and c.grounded and self.dodgeAir then self.dodge=nil;self.lastDodge=now end
end
local _,_,_,fullBoost=plus()
if fullBoost then
a.boost=s.allowBoost~=false and (s.boost or 0)>0 and math.abs(c.fwd.z)<.25 and front>.95 and speed<22.6
else
a.boost=a.boost and math.abs(c.fwd.z)<.25 and front>.97 and
(distance<7 or (s.boost or 0)>14 and speed<18.5)
end
return a
end
return Tactics
]==]

local env = type(getgenv) == "function" and getgenv() or _G
env.TurboAIPlus = type(env.TurboAIPlus) == "table" and env.TurboAIPlus or {}
local settings = env.TurboAIPlus

local baseLoad = env.__TurboAIPlusLoadstring or loadstring
assert(type(baseLoad) == "function", "This executor is missing loadstring")
local compiled, compileError = baseLoad(TACTICS_SOURCE, "=TurboAI/Tactics")
assert(compiled, "TurboAI Plus failed to compile: " .. tostring(compileError))
local Plus = compiled()

-- future starts: Turbo AI compiles each module with loadstring(source, "=TurboAI/<name>")
env.__TurboAIPlusSource = TACTICS_SOURCE
if not env.__TurboAIPlusLoadstring then
    env.__TurboAIPlusLoadstring = baseLoad
    env.loadstring = function(source, name, ...)
        if name == "=TurboAI/Tactics" and type(env.__TurboAIPlusSource) == "string" then
            return baseLoad(env.__TurboAIPlusSource, name)
        end
        return baseLoad(source, name, ...)
    end
end

-- already running: the live bot calls methods through its Tactics module table, so
-- replacing them there upgrades it immediately
local function chunkOf(fn)
    local ok, source = pcall(debug.info, fn, "s")
    if ok and type(source) == "string" then return source end
    if type(debug.getinfo) == "function" then
        local okInfo, info = pcall(debug.getinfo, fn)
        if okInfo and type(info) == "table" then return info.source end
    end
    return nil
end

local patched = 0
if type(getgc) == "function" then
    local ok, objects = pcall(getgc, true)
    if ok and type(objects) == "table" then
        for _, t in ipairs(objects) do
            if type(t) == "table" and t ~= Plus and rawget(t, "__index") == t
                and type(rawget(t, "step")) == "function" and type(rawget(t, "new")) == "function"
                and (chunkOf(rawget(t, "step")) or ""):gsub("^[=@]", "") == "TurboAI/Tactics" then
                for key, value in pairs(Plus) do
                    if type(value) == "function" or key == "PLUS_VERSION" then t[key] = value end
                end
                patched += 1
            end
        end
    end
end

-- no UI of its own: remove the PLUS button an earlier version may have left on screen
if env.__TurboAIPlusGui then pcall(function() env.__TurboAIPlusGui:Destroy() end); env.__TurboAIPlusGui = nil end

print("[TurboAI Plus 1.1] " .. (patched > 0 and "upgraded the running Turbo AI" or "ready, start Turbo AI and it loads upgraded")
    .. " (live modules patched: " .. patched .. ")")
