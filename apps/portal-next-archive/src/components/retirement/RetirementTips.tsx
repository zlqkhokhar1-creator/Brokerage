'use client';

import React from 'react';
import { motion } from '@/components/MotionWrappers';
import { Card, CardContent } from '@/components/ui/card';
import { Target, PieChart, TrendingUp, Clock } from 'lucide-react';

export const RetirementTips: React.FC = () => {
  const tips = [
    {
      icon: Target,
      title: 'Start Early (جلدی شروع کریں)',
      description: 'Time is your greatest asset. Starting retirement planning in your 20s or 30s can make a massive difference due to compound interest.',
      urduTip: 'وقت آپ کا سب سے بڑا اثاثہ ہے۔ بیس اور تیس سال کی عمر میں ریٹائرمنٹ پلاننگ شروع کرنا compound interest کے باعث بہت بڑا فرق لا سکتا ہے۔'
    },
    {
      icon: PieChart,
      title: 'Diversify Your Portfolio (اپنے پورٹ فولیو میں تنوع)',
      description: 'Spread your investments across different asset classes to reduce risk while maintaining growth potential.',
      urduTip: 'خطرے کو کم کرنے اور نمو کی صلاحیت کو برقرار رکھنے کے لیے اپنی سرمایہ کاری کو مختلف اثاثہ جاتی کلاسوں میں تقسیم کریں۔'
    },
    {
      icon: TrendingUp,
      title: 'Increase Contributions Regularly (باقاعدگی سے حصہ بڑھائیں)',
      description: 'Try to increase your monthly contributions by 10-15% every year or whenever you get a salary raise.',
      urduTip: 'ہر سال یا جب بھی آپ کو تنخواہ میں اضافہ ملے تو اپنے ماہانہ حصے میں 10-15% اضافہ کرنے کی کوشش کریں۔'
    },
    {
      icon: Clock,
      title: 'Review and Adjust (جائزہ اور تبدیلی)',
      description: 'Review your retirement plan annually and adjust based on life changes, market conditions, and goal updates.',
      urduTip: 'اپنے ریٹائرمنٹ پلان کا سالانہ جائزہ لیں اور زندگی کی تبدیلیوں، مارکیٹ کے حالات، اور اہداف کی تبدیلی کی بنیاد پر اسے ایڈجسٹ کریں۔'
    }
  ];

  return (
    <motion.section 
      className="py-20"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <div className="container mx-auto px-4">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
            Retirement Planning Tips
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Expert advice to maximize your retirement savings and secure your financial future.
          </p>
        </motion.div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {tips.map((tip, index) => {
            const Icon = tip.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                <Card className="text-center group h-full">
                  <CardContent className="pt-6">
                    <motion.div 
                      className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-600 group-hover:text-white transition-all duration-300"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <Icon className="w-8 h-8 text-green-600 group-hover:text-white" />
                    </motion.div>
                    
                    <h3 className="text-lg font-bold text-slate-900 mb-3 group-hover:text-green-600 transition-colors">
                      {tip.title}
                    </h3>
                    
                    <p className="text-slate-600 text-sm leading-relaxed mb-4">
                      {tip.description}
                    </p>
                    
                    <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-600 leading-relaxed">
                      <strong>Urdu:</strong> {tip.urduTip}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
};
