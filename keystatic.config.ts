import { config, collection, fields } from '@keystatic/core';

export default config({
  storage: {
    kind: 'github',
    repo: {
      owner: 'historyblogs',
      name: 'stablo-blog-please-work-studio-integrate',
    },
  },

  ui: {
    brand: { name: 'RIP Los Angeles' },
  },

  collections: {
    posts: collection({
      label: 'Posts',
      slugField: 'title',
      path: 'src/data/post/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        publishDate: fields.date({
          label: 'Publish Date',
          defaultValue: { kind: 'today' },
        }),
        updateDate: fields.date({ label: 'Updated Date' }),
        draft: fields.checkbox({ label: 'Draft (hide from site)', defaultValue: false }),
        excerpt: fields.text({ label: 'Excerpt', multiline: true }),
        image: fields.image({
          label: 'Hero Image',
          directory: 'src/assets/images/blog',
          publicPath: '~/assets/images/blog/',
        }),
        category: fields.text({ label: 'Category' }),
        tags: fields.array(fields.text({ label: 'Tag' }), {
          label: 'Tags',
        }),
        author: fields.text({ label: 'Author', defaultValue: 'Nathan Marsak' }),
        content: fields.mdx({
          label: 'Content',
          images: {
            directory: 'src/assets/images/blog',
            publicPath: '~/assets/images/blog/',
          },
        }),
      },
    }),
  },
});
