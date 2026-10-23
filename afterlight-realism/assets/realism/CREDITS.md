# Afterlight v12 Realism — asset credits

All photoscanned surfaces and sky HDRIs are from Poly Haven (https://polyhaven.com)
and are dedicated to the public domain under CC0 1.0. They were resized, packed
(albedo with 28 % cavity AO; normal XY + roughness) and, for skies, split into an
LDR sky band and a small RGBE light probe for this build.

Surfaces: floor_tiles_08, plaster_grey_04, concrete_wall_008, concrete_floor_worn_001,
brick_wall_001, concrete_wall_003, wood_table_worn, raw_plank_wall, weathered_brown_planks,
pine_bark, green_metal_rust, container_side, velour_velvet, dirty_carpet, hessian_230,
asphalt_02, dirt, sparse_grass, coast_sand_01, rock_face_03, brown_leather, rough_linen,
cotton_jersey, oak_veneer_01.

Skies: kloofendal_48d_partly_cloudy_puresky, kloofendal_38d_partly_cloudy_puresky,
kloofendal_overcast_puresky, kloofendal_43d_clear_puresky, kloppenheim_07_puresky,
qwantani_moon_noon_puresky, kloppenheim_02_puresky.

Generated for this build (CC0): gunmetal (phosphate finish), polymer (stippled frame),
pores (skin micro-relief).

## v12.2 bodies

Human bodies (base mesh hm08, macro shape targets, the 53-bone game-engine
skeleton and its skin weights), skins, clothes, shoes, eyes, eyebrows and hair
come from MakeHuman / MPFB2 (http://www.makehumancommunity.org), released as
CC0 1.0 ("makehuman_system_assets_cc0" pack and the MPFB2 data folder).

For this build they were shaped (gender, age, muscle, weight, height,
proportions and ethnicity mixes), fitted with clothes, stripped of skin hidden
under clothing, skinned to the game-engine skeleton and baked into
`bodies/*.bin`. Their textures were resized and repainted: the camouflage is
generated over the original fabric detail and ambient occlusion, gloves are
generated over the skin's hand detail, and the zombies' decay, blood, dirt and
torn clothing are painted from 3D position.

Clothes used: male_casualsuit02-06, male_worksuit01, male_elegantsuit01,
shoes01-06. Skins used: young/middleage/old caucasian, african and asian
male. Hair: short01, short03. Eyes: low-poly with brown and grey materials.
Eyebrows: eyebrow001.
