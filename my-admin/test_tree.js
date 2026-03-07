const fs = require('fs');

const rawData = fs.readFileSync('d:/STUDY/nam3/HK2/web2/VitaCare/data/tree_complete.json', 'utf8');
const treeData = JSON.parse(rawData);

const provincesObject = Array.isArray(treeData) ? treeData[0] : treeData;

const cities = Object.values(provincesObject)
    .map((province) => {
        const districts = [];

        if (province['quan-huyen']) {
            Object.values(province['quan-huyen']).forEach((district) => {
                const wards = [];

                if (district['xa-phuong']) {
                    Object.values(district['xa-phuong']).forEach((ward) => {
                        if (ward && ward.name && ward.name.trim() !== '') {
                            wards.push({
                                code: ward.code || '',
                                name_with_type: ward.name_with_type || ward.name || '',
                                name: ward.name || ''
                            });
                        }
                    });
                }

                if (district && district.name && district.name.trim() !== '') {
                    districts.push({
                        code: district.code || '',
                        name_with_type: district.name_with_type || district.name || '',
                        name: district.name || '',
                        'xa-phuong': wards.sort((a, b) => a.name.localeCompare(b.name, 'vi'))
                    });
                }
            });
        }

        if (province && province.name && province.name.trim() !== '') {
            return {
                code: province.code || '',
                name_with_type: province.name_with_type || province.name || '',
                name: province.name || '',
                'quan-huyen': districts.sort((a, b) => a.name.localeCompare(b.name, 'vi'))
            };
        }
        return null;
    })
    .filter((province) => province !== null)
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));

console.log('Cities length:', cities.length);
if (cities.length > 0) {
    console.log('First city:', cities[0].name_with_type);
}
