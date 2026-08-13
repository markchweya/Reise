insert into public.operators (id, name, public_code) values ('10000000-0000-0000-0000-000000000001', 'Reise Test Operator', 'REISE-TEST');

insert into public.vehicles (id, operator_id, fleet_number, public_code) values
('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','6007','R6007'),
('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','6012','R6012'),
('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','4703','R4703');

insert into public.stops (id,name,latitude,longitude,accessible,platform) values
('reding','Basel, Redingstrasse',47.5408,7.5709,true,null),('schutzen','Basel, Schützenhaus',47.5481,7.5759,true,null),
('bahnhof','Basel SBB',47.5476,7.5896,true,'Kante A'),('aeschen','Basel, Aeschenplatz',47.5521,7.5928,true,null),
('jakob','Basel, St. Jakob',47.5417,7.6182,true,'Kante B'),('muttenz','Muttenz, Industriepark',47.5322,7.6392,true,null),
('stallen','Reinach BL, Stallenstrasse',47.4934,7.5895,true,null),('bottmingen','Bottmingen, Schloss',47.5238,7.5722,true,null),
('biel','Biel-Benken, Brücke',47.5075,7.5262,false,null);

insert into public.routes (id,operator_id,line_code,direction_id,destination,colour) values
('b60-east','10000000-0000-0000-0000-000000000001','B60','east','Muttenz, Industriepark','#EB0000'),
('b60-west','10000000-0000-0000-0000-000000000001','B60','west','Biel-Benken, Brücke','#EB0000'),
('b47-south','10000000-0000-0000-0000-000000000001','B47','south','Reinach BL, Stallenstrasse','#343A40'),
('b47-north','10000000-0000-0000-0000-000000000001','B47','north','Basel SBB','#343A40'),
('b57-event','10000000-0000-0000-0000-000000000001','B57','event','Basel, St. Jakob','#5B6670');

insert into public.fare_products (name,product_type,base_price_chf,travelcard,is_prototype) values
('Regular ticket','regular',5.20,'none',true),('Supersaver','supersaver',3.65,'none',true),('Half Fare supersaver','supersaver',1.83,'half_fare',true);
