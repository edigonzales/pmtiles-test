# pmtiles-test

```
conda create -n gdal
```

```
conda activate gdal
```

```
conda install conda-forge::gdal
```

```
conda install conda-forge::tippecanoe
```


```
conda deactivate
```


```
ogr2ogr -f GPKG grundnutzung_3857.gpkg npl_nutzungsplanung_v1_2_2056.gpkg \
  -nln grundnutzung \
  -t_srs EPSG:3857 \
  -nlt PROMOTE_TO_MULTI \
  -lco SPATIAL_INDEX=YES \
  grundnutzung
```

```
ogr2ogr -t_srs EPSG:4326 cb_2018_us_zcta510_500k.json cb_2018_us_zcta510_500k.shp
# Creates a layer in the vector tiles named "zcta"
tippecanoe -zg --projection=EPSG:4326 -o cb_2018_us_zcta510_500k_nolimit.pmtiles -l zcta cb_2018_us_zcta510_500k.json


ogr2ogr -f GeoJSONSeq /vsistdout/ npl_nutzungsplanung_v1_2_2056.gpkg grundnutzung -lco RS=YES -t_srs EPSG:4326 \
| tippecanoe -o grundnutzung.pmtiles -zg --drop-densest-as-needed -r1 -pk -pf --layer=grundnutzung
```


```
ogr2ogr -f GeoJSONSeq /vsistdout/ npl_nutzungsplanung_v1_2_2056.gpkg grundnutzung -lco RS=YES -t_srs EPSG:4326 \
| tippecanoe -o grundnutzung.pmtiles --minimum-zoom=10 --maximum-zoom=20 --drop-densest-as-needed -r1 -pk -pf --layer=grundnutzung --use-attribute-for-id=t_id --no-clipping
```


 
```
git fetch origin pull/9/head:codex/update-interlistextdocumentservice-to-bypass-cache
```
 
```
git checkout codex/update-interlistextdocumentservice-to-bypass-cache
```
 
```
git checkout main
```