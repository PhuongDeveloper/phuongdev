/* ==========================================================================
   Featured Projects - Section hiển thị dự án tiêu biểu (Red Style)
   ========================================================================== */

'use client';

import { motion, type Variants } from 'framer-motion';
import { ExternalLink, FolderKanban, Eye } from 'lucide-react';
import { FaGithub as Github } from 'react-icons/fa';
import Card from '@/components/ui/Card';
import { type Project } from '@/lib/types/database';
import { truncateText } from '@/utils/helpers';

interface FeaturedProjectsProps {
  projects: Project[];
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export default function FeaturedProjects({ projects }: FeaturedProjectsProps) {
  if (!projects || projects.length === 0) return null;

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center justify-center p-3 bg-rose-50 rounded-2xl mb-6"
          >
            <FolderKanban className="w-6 h-6 text-rose-600" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl font-bold text-slate-900 mb-4"
          >
            Dự Án Nổi Bật
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-600 max-w-2xl mx-auto"
          >
            Các sản phẩm tâm huyết thể hiện năng lực và kinh nghiệm kỹ thuật.
          </motion.p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="flex overflow-x-auto gap-6 pb-8 snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} // Ẩn scrollbar
        >
          {/* Style để ẩn scrollbar cho Webkit */}
          <style dangerouslySetInnerHTML={{__html: `
            .flex::-webkit-scrollbar {
              display: none;
            }
          `}} />

          {projects.map((project) => (
            <motion.div key={project.id} variants={itemVariants} className="snap-start shrink-0 w-[300px] md:w-[400px]">
              <Card variant="glass" className="h-full flex flex-col overflow-hidden group border-slate-200">
                {/* Ảnh cover (Nửa trên) */}
                <div className="w-full aspect-video bg-slate-100 relative overflow-hidden shrink-0">
                  {project.image_url ? (
                    <img
                      src={project.image_url}
                      alt={project.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400 font-medium">
                      Project
                    </div>
                  )}
                  {/* Overlay shadow */}
                  <div className="absolute inset-0 border-b border-slate-200/50 mix-blend-multiply pointer-events-none" />
                </div>

                {/* Nội dung text (Nửa dưới) */}
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-3 group-hover:text-rose-600 transition-colors line-clamp-1">
                    {project.title}
                  </h3>

                  <p className="text-slate-600 mb-6 flex-1 text-sm md:text-base">
                    {truncateText(project.description, 100)}
                  </p>

                  <div className="space-y-6 mt-auto">
                    {/* Views & Links */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                      <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
                        <Eye className="w-4 h-4" />
                        <span>{project.views?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        {project.demo_url && (
                          <a
                            href={project.demo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-sm font-medium text-rose-600 hover:text-rose-700 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Truy cập
                          </a>
                        )}

                        {project.github_url && (
                          <a
                            href={project.github_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                          >
                            <Github className="w-4 h-4" />
                            Code
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
