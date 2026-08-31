import fs from 'fs';
let code = fs.readFileSync('frontend/src/pages/challenges/ChallengesTab.jsx', 'utf8');

const target1 = "{/* --- 1. THE SPINNING WHEEL --- */}";
const replacement1 = `
            {cardState?.locked_mid_week && !cardState?.is_scratched ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  background: 'linear-gradient(135deg, #FF7A00 0%, #FF3D00 100%)',
                  borderRadius: '24px',
                  padding: '40px 30px',
                  textAlign: 'center',
                  color: 'white',
                  width: '320px',
                  boxShadow: '0 25px 50px -12px rgba(255, 61, 0, 0.4)'
                }}
              >
                <Lock size={48} style={{ color: 'white', margin: '0 auto 20px auto' }} />
                <h3 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 12px 0', letterSpacing: '0.5px' }}>Mid-Week Joiner!</h3>
                <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '15px', lineHeight: '1.6', margin: 0, fontWeight: 500 }}>
                  AI is actively curating challenges for your branch ({cardState?.user_branch || "your branch"}).
                  <br /><br />
                  Come back on <strong>Monday</strong> to unlock your first set of challenges!
                </p>
              </motion.div>
            ) : (
              <>
            {/* --- 1. THE SPINNING WHEEL --- */}`;

code = code.replace(target1, replacement1);

const target2 = "{/* --- 1.5. THE MAGICAL SHOCKWAVE FLASH --- */}";
const replacement2 = `
              </>
            )}
            {/* --- 1.5. THE MAGICAL SHOCKWAVE FLASH --- */}`;

code = code.replace(target2, replacement2);

fs.writeFileSync('frontend/src/pages/challenges/ChallengesTab.jsx', code);
console.log('Done!');
